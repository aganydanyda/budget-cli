import { ApplicationController } from "./ApplicationController";
import { TransactionType } from "./enums";
 
// Начальные данные: два счёта с несколькими транзакциями.
function setInitialState(controller: ApplicationController): void {
  const personalAccount = controller.accountManager.createAccount("Личный бюджет");
  personalAccount.addTransaction({ type: TransactionType.Income, amount: 1000, category: "Зарплата", date: "2023-01-01", description: "Зарплата за январь" });
  personalAccount.addTransaction({ type: TransactionType.Expense, amount: 200, category: "Еда", date: "2023-01-05", description: "Продукты" });
  personalAccount.addTransaction({ type: TransactionType.Expense, amount: 150, category: "Жильё", date: "2023-01-09", description: "Коммунальные услуги" });
 
  const vacationAccount = controller.accountManager.createAccount("Копилка на отпуск");
  vacationAccount.addTransaction({ type: TransactionType.Income, amount: 500, category: "Премия", date: "2023-04-01", description: "Премия" });
  vacationAccount.addTransaction({ type: TransactionType.Income, amount: 600, category: "Долги", date: "2023-01-01", description: "Возврат долга" });
  vacationAccount.addTransaction({ type: TransactionType.Expense, amount: 300, category: "Путешествия", date: "2023-01-05", description: "Билеты на самолёт" });
  vacationAccount.addTransaction({ type: TransactionType.Expense, amount: 200, category: "Путешествия", date: "2023-01-09", description: "Номер в отеле" });
}
 
const controller: ApplicationController = new ApplicationController();
setInitialState(controller);
 
controller.start().catch((error: unknown): void => {
  console.error("Критическая ошибка:", error);
  process.exit(1);
});
 