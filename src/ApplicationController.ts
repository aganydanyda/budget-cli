import inquirer from "inquirer";
import { Account } from "./Account";
import { AccountManager } from "./AccountManager";
import { AccountMenuAction, MainMenuAction, TransactionType } from "./enums";
import { AccountId, TransactionInput } from "./interfaces";
import { Transaction } from "./Transaction";

type MenuChoice = { name: string; value: string };

interface TransactionAnswers {
  type: TransactionType;
  amount: string;
  category: string;
  date: string;
  description: string;
}

// Отвечает за общение с пользователем: меню, ввод, подтверждения (всё через inquirer).
export class ApplicationController {
  private static readonly CANCEL_VALUE: string = "cancel";
  private static readonly DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly AMOUNT_REGEX: RegExp = /^\d+([.,]\d{1,2})?$/;

  private readonly manager: AccountManager;
  private notice: string = "";

  constructor(manager: AccountManager) {
    this.manager = manager;
  }

  // Главный цикл программы.
  public async run(): Promise<void> {
    let running: boolean = true;
    while (running) {
      running = await this.showMainMenu();
    }
    console.clear();
    console.log("До свидания!");
  }

  // ---------- Главное меню ----------

  // Возвращает false, когда пользователь выбрал выход.
  private async showMainMenu(): Promise<boolean> {
    console.clear();
    console.log("=== Управление личными финансами ===\n");
    this.printNotice();

    const accounts: Account[] = this.manager.getAccounts();
    if (accounts.length === 0) {
      console.log("Счетов пока нет. Создайте первый.\n");
    }

    const accountChoices: MenuChoice[] = accounts.map(
      (account: Account): MenuChoice => ({
        name: `${account.name} (баланс: ${account.getBalance().toFixed(2)})`,
        value: account.id,
      })
    );
    const choices: MenuChoice[] = [
      ...accountChoices,
      { name: "+ Создать новый счёт", value: MainMenuAction.CreateAccount },
      { name: "Выход", value: MainMenuAction.Exit },
    ];

    const { choice }: { choice: string } = await inquirer.prompt<{ choice: string }>([
      {
        type: "list",
        name: "choice",
        message: "Выберите счёт или действие:",
        choices,
      },
    ]);

    if (choice === MainMenuAction.Exit) {
      return false;
    }
    if (choice === MainMenuAction.CreateAccount) {
      await this.createAccount();
      return true;
    }
    await this.showAccountMenu(choice);
    return true;
  }

  private async createAccount(): Promise<void> {
    console.clear();
    console.log("=== Новый счёт ===\n");

    const { name }: { name: string } = await inquirer.prompt<{ name: string }>([
      {
        type: "input",
        name: "name",
        message: "Название счёта:",
        validate: (value: string): boolean | string => {
          const trimmed: string = value.trim();
          if (trimmed.length === 0) {
            return "Название не может быть пустым.";
          }
          if (trimmed.length > 40) {
            return "Название слишком длинное (максимум 40 символов).";
          }
          return true;
        },
      },
    ]);

    const account: Account = this.manager.createAccount(name);
    this.notice = `Счёт «${account.name}» создан.`;
  }

  // ---------- Меню счёта ----------

  private async showAccountMenu(accountId: AccountId): Promise<void> {
    let inAccount: boolean = true;

    while (inAccount) {
      const account: Account | undefined = this.manager.getAccount(accountId);
      if (account === undefined) {
        return;
      }

      console.clear();
      this.printAccount(account);
      this.printNotice();

      const { action }: { action: AccountMenuAction } = await inquirer.prompt<{
        action: AccountMenuAction;
      }>([
        {
          type: "list",
          name: "action",
          message: "Что сделать?",
          choices: [
            { name: "Добавить транзакцию", value: AccountMenuAction.AddTransaction },
            { name: "Удалить транзакцию", value: AccountMenuAction.DeleteTransaction },
            { name: "Экспортировать в CSV", value: AccountMenuAction.ExportCsv },
            { name: "Удалить счёт", value: AccountMenuAction.DeleteAccount },
            { name: "Назад", value: AccountMenuAction.Back },
          ],
        },
      ]);

      switch (action) {
        case AccountMenuAction.AddTransaction:
          await this.addTransaction(account);
          break;
        case AccountMenuAction.DeleteTransaction:
          await this.deleteTransaction(account);
          break;
        case AccountMenuAction.ExportCsv:
          this.exportAccount(account);
          break;
        case AccountMenuAction.DeleteAccount:
          inAccount = !(await this.deleteAccount(account));
          break;
        case AccountMenuAction.Back:
          inAccount = false;
          break;
      }
    }
  }

  private printAccount(account: Account): void {
    console.log(`=== Счёт: ${account.name} ===`);
    console.log(`Баланс: ${account.getBalance().toFixed(2)}\n`);

    const transactions: Transaction[] = account.transactions;
    if (transactions.length === 0) {
      console.log("Транзакций пока нет.\n");
      return;
    }

    console.log("Транзакции:");
    transactions.forEach((transaction: Transaction, index: number): void => {
      console.log(`  ${index + 1}. ${transaction.toDisplayString()}`);
    });
    console.log("");
  }

  // ---------- Добавление транзакции ----------

  private async addTransaction(account: Account): Promise<void> {
    console.clear();
    console.log(`=== Новая транзакция (счёт «${account.name}») ===\n`);

    const answers: TransactionAnswers = await inquirer.prompt<TransactionAnswers>([
      {
        type: "list",
        name: "type",
        message: "Тип транзакции:",
        choices: [
          { name: "Доход", value: TransactionType.Income },
          { name: "Расход", value: TransactionType.Expense },
        ],
      },
      {
        type: "input",
        name: "amount",
        message: "Сумма (например, 1250.50):",
        validate: (value: string): boolean | string => this.validateAmount(value),
      },
      {
        type: "input",
        name: "category",
        message: "Категория (например, Еда):",
        validate: (value: string): boolean | string => {
          const trimmed: string = value.trim();
          if (trimmed.length === 0) {
            return "Категория не может быть пустой.";
          }
          if (trimmed.length > 30) {
            return "Категория слишком длинная (максимум 30 символов).";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "date",
        message: "Дата (ГГГГ-ММ-ДД):",
        default: this.getToday(),
        validate: (value: string): boolean | string => this.validateDate(value),
      },
      {
        type: "input",
        name: "description",
        message: "Описание (можно оставить пустым):",
        validate: (value: string): boolean | string =>
          value.trim().length <= 100 ? true : "Описание слишком длинное (максимум 100 символов).",
      },
    ]);

    const input: TransactionInput = {
      type: answers.type,
      amount: Number(answers.amount.replace(",", ".")),
      category: answers.category.trim(),
      date: answers.date.trim(),
      description: answers.description.trim(),
    };

    account.addTransaction(input);
    this.notice = "Транзакция добавлена.";
  }

  private validateAmount(value: string): boolean | string {
    const trimmed: string = value.trim();
    if (!ApplicationController.AMOUNT_REGEX.test(trimmed)) {
      return "Введите положительное число, не более двух знаков после запятой.";
    }
    if (Number(trimmed.replace(",", ".")) <= 0) {
      return "Сумма должна быть больше нуля.";
    }
    return true;
  }

  private validateDate(value: string): boolean | string {
    const trimmed: string = value.trim();
    if (!ApplicationController.DATE_REGEX.test(trimmed)) {
      return "Дата должна быть в формате ГГГГ-ММ-ДД, например 2026-10-21.";
    }
    const parts: number[] = trimmed.split("-").map(Number);
    const year: number = parts[0];
    const month: number = parts[1];
    const day: number = parts[2];
    const date: Date = new Date(year, month - 1, day);
    const isReal: boolean =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return isReal ? true : "Такой даты не существует.";
  }

  private getToday(): string {
    const now: Date = new Date();
    const month: string = String(now.getMonth() + 1).padStart(2, "0");
    const day: string = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  // ---------- Удаление транзакции ----------

  private async deleteTransaction(account: Account): Promise<void> {
    const transactions: Transaction[] = account.transactions;
    if (transactions.length === 0) {
      this.notice = "На этом счёте нет транзакций для удаления.";
      return;
    }

    console.clear();
    console.log(`=== Удаление транзакции (счёт «${account.name}») ===\n`);

    const choices: MenuChoice[] = [
      ...transactions.map(
        (transaction: Transaction): MenuChoice => ({
          name: transaction.toDisplayString(),
          value: transaction.id,
        })
      ),
      { name: "Отмена", value: ApplicationController.CANCEL_VALUE },
    ];

    const { transactionId }: { transactionId: string } = await inquirer.prompt<{
      transactionId: string;
    }>([
      {
        type: "list",
        name: "transactionId",
        message: "Какую транзакцию удалить?",
        choices,
      },
    ]);

    if (transactionId === ApplicationController.CANCEL_VALUE) {
      return;
    }

    const confirmed: boolean = await this.confirm("Удалить эту транзакцию?");
    if (!confirmed) {
      this.notice = "Удаление отменено.";
      return;
    }

    const removed: boolean = account.removeTransaction(transactionId);
    this.notice = removed ? "Транзакция удалена." : "Транзакция не найдена.";
  }

  // ---------- Удаление счёта ----------

  // Возвращает true, если счёт был удалён.
  private async deleteAccount(account: Account): Promise<boolean> {
    const confirmed: boolean = await this.confirm(
      `Удалить счёт «${account.name}» вместе со всеми транзакциями (${account.transactions.length})?`
    );
    if (!confirmed) {
      this.notice = "Удаление отменено.";
      return false;
    }

    const name: string = account.name;
    const deleted: boolean = this.manager.deleteAccount(account.id);
    this.notice = deleted ? `Счёт «${name}» удалён.` : "Счёт не найден.";
    return deleted;
  }

  // ---------- Экспорт ----------

  private exportAccount(account: Account): void {
    try {
      const filePath: string = this.manager.exportToCsv(account.id);
      this.notice = `Данные сохранены в файл: ${filePath}`;
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      this.notice = `Не удалось экспортировать: ${message}`;
    }
  }

  // ---------- Вспомогательные методы ----------

  private async confirm(message: string): Promise<boolean> {
    const { confirmed }: { confirmed: boolean } = await inquirer.prompt<{
      confirmed: boolean;
    }>([
      {
        type: "confirm",
        name: "confirmed",
        message,
        default: false,
      },
    ]);
    return confirmed;
  }

  // Показывает сообщение пользователю один раз и очищает его.
  private printNotice(): void {
    if (this.notice !== "") {
      console.log(`${this.notice}\n`);
      this.notice = "";
    }
  }
}