import { connect } from "@accounting/db";
import { env } from "../src/env";
import logger from "../src/logger";
import CurrenciesService, { Currency } from "../src/services/currencies";

const log = logger("cmd/worker");
const INTERVAL_MS = 10_000;

connect(env.DATABASE_URL);
log.info("Connected to database");

const service = new CurrenciesService();

// updates prices every 10 seconds
while (true) {
  const ethPrice = await service.getEthPrice();
  if (ethPrice.isOk()) {
    const updated = await service.updateCurrentPrice(Currency.ETH, ethPrice.unwrap());
    if (updated.isErr()) {
      log.error("Could not store price of ETH", updated.unwrapErr());
    } else {
      log.debug(`ETH price updated: ${ethPrice.unwrap().toFixed(2)} USD`);
    }
  } else {
    log.error("Could not get price of ETH", ethPrice.unwrapErr());
  }
  await Bun.sleep(INTERVAL_MS);
}
