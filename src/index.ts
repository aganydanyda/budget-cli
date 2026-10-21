import { AccountManager } from "./AccountManager";
import { ApplicationController } from "./ApplicationController";

const controller: ApplicationController = new ApplicationController(new AccountManager());

controller.run().catch((error: unknown): void => {
  console.error("Критическая ошибка:", error);
  process.exit(1);
});