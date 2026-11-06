import { describe, expect, it } from "bun:test";
import CurrenciesService, { Currency } from "./currencies";

describe("Currencies", () => {
  it("uses the stored price when it is fresh", async () => {
    const currencies = new CurrenciesService();
    await currencies.updateCurrentPrice(Currency.ETH, 1234);
    await currencies.updateCurrentPrice(Currency.ETH, 2345);

    const price = await currencies.getPriceOf(Currency.ETH);
    expect(price.unwrap()).toBe(2345);
  });

  it("returns 1 for usd", async () => {
    const price = await new CurrenciesService().getPriceOf(Currency.USD);
    expect(price.unwrap()).toBe(1);
  });

  // hits a live Ethereum RPC: TEST_NETWORK=1 bun run test
  it.skipIf(!process.env.TEST_NETWORK)("fetches the eth price from the uniswap pool", async () => {
    const result = await new CurrenciesService().getEthPrice();
    if (result.isErr()) throw new Error(result.unwrapErr());
    expect(result.unwrap()).toBeGreaterThan(100);
    expect(result.unwrap()).toBeLessThan(100_000);
  });
});
