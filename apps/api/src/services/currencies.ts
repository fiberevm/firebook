import { eq } from "drizzle-orm";
import { Err, Ok, type Result } from "oxide.ts";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import { currentCurrencyPricesTable, db } from "@accounting/db";
import { SUPPORTED_CURRENCIES } from "@accounting/shared";
import { env } from "../env";
import logger from "../logger";

const log = logger("services/currencies");

export enum Currency {
  USD = "usd",
  SOL = "sol",
  ETH = "eth",
  BNB = "bnb",
  POL = "pol",
}

// Uniswap v3 USDC/WETH 0.05% pool
const USDC_WETH_POOL = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const poolAbi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
]);

const RPC_DEADLINE_MS = 10_000;

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`RPC call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// prices stored by the worker are considered fresh for this long
const PRICE_MAX_AGE_MS = 10 * 60 * 1000;

class CurrenciesService {
  getSupportedCurrencies(): string[] {
    return [...SUPPORTED_CURRENCIES];
  }

  async getPriceOf(currency: Currency): Promise<Result<number, string>> {
    if (currency === Currency.USD) {
      return Ok(1);
    }

    // prefer the price maintained by the worker
    const [stored] = await db().select().from(currentCurrencyPricesTable).where(eq(currentCurrencyPricesTable.currency, currency)).limit(1);

    if (stored && Date.now() - stored.updatedAt.getTime() < PRICE_MAX_AGE_MS) {
      return Ok(stored.usdPrice);
    }

    if (currency === Currency.ETH) {
      const live = await this.getEthPrice();
      if (live.isOk()) {
        return live;
      }
      // fall back to a stale price rather than failing the request
      if (stored) {
        log.warn(`Using stale ${currency} price: ${live.unwrapErr()}`);
        return Ok(stored.usdPrice);
      }
      return live;
    }

    return Err(`Currency not supported: ${currency}`);
  }

  async getEthPrice(): Promise<Result<number, string>> {
    try {
      const client = createPublicClient({
        transport: http(env.RPC_URL, { timeout: 5_000, retryDelay: 200, retryCount: 2 }),
        chain: mainnet,
      });

      // hard deadline: viem honors Retry-After on 429s, which can stall for minutes
      const [sqrtPriceX96] = await withDeadline(client.readContract({ address: USDC_WETH_POOL, abi: poolAbi, functionName: "slot0" }), RPC_DEADLINE_MS);

      // price of token1 (WETH) in token0 (USDC) raw units = (sqrtPriceX96 / 2^96)^2
      const sqrt = Number(sqrtPriceX96) / 2 ** 96;
      const rawPrice = sqrt * sqrt;
      // USDC has 6 decimals and WETH 18, invert to get USD per ETH
      const usdPerEth = 1 / (rawPrice / 10 ** 12);

      if (!Number.isFinite(usdPerEth) || usdPerEth <= 0) {
        return Err("Invalid eth price computed from pool");
      }

      return Ok(usdPerEth);
    } catch (e) {
      // viem errors embed the full response body in `message`, keep it short
      const err = e as Error & { shortMessage?: string; status?: number };
      const reason = err.status ? `HTTP ${err.status}` : (err.shortMessage ?? err.message);
      return Err("Could not get eth price: " + reason);
    }
  }

  // update the current price of a currency in the database
  async updateCurrentPrice(currency: Currency, usdPrice: number): Promise<Result<void, string>> {
    try {
      const updated = await db()
        .update(currentCurrencyPricesTable)
        .set({ usdPrice, updatedAt: new Date() })
        .where(eq(currentCurrencyPricesTable.currency, currency))
        .returning({ id: currentCurrencyPricesTable.id });

      if (updated.length === 0) {
        await db().insert(currentCurrencyPricesTable).values({ currency, usdPrice, updatedAt: new Date() });
      }

      return Ok(undefined);
    } catch (e) {
      return Err((e as Error).message);
    }
  }
}

export default CurrenciesService;
