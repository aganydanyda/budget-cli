import { TransactionType } from "./enums";
import { ITransaction, TransactionInput } from "./interfaces";

// Одна операция по счёту: доход или расход. После создания не меняется.
export class Transaction implements ITransaction {
  public static readonly CSV_HEADER: string =
    "id,date,type,category,amount,description";

  public readonly id: string;
  public readonly type: TransactionType;
  public readonly amount: number;
  public readonly category: string;
  public readonly date: string;
  public readonly description: string;

  constructor(id: string, input: TransactionInput) {
    this.id = id;
    this.type = input.type;
    this.amount = input.amount;
    this.category = input.category;
    this.date = input.date;
    this.description = input.description;
  }

  // Краткое описание для списка выбора в меню. 
  public toDisplayString(): string {
    const sign: string = this.type === TransactionType.Income ? "+" : "-";
    return `${this.date} | ${sign}${this.amount.toFixed(2)} | ${this.category} | ${this.description}`;
  }

  // Строка для CSV-файла.
  public toCsvRow(): string {
    const fields: string[] = [
      this.id,
      this.date,
      this.type,
      this.category,
      this.amount.toFixed(2),
      this.description,
    ];
    return fields.map((field: string): string => Transaction.escapeCsv(field)).join(",");
  }

  private static escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}