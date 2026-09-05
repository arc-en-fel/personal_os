import unittest

from main import MAX_TRANSACTION_AMOUNT, parse_amount, rows_from_csv, rows_from_text


class StatementParserTests(unittest.TestCase):
    def test_sbi_text_uses_debit_or_credit_before_balance(self):
        statement = """
        Value Date Post Date Details Ref No Debit Credit Balance
        01/08/2026 01/08/2026 WDL TFR UPI/DR/632126 Abdul 80.00 - 95.46
        02/08/2026 02/08/2026 DEP TFR UPI/CR/621449 SHYMA - 1,000.00 1,095.46
        """
        rows = rows_from_text(statement)
        self.assertEqual([row["amount"] for row in rows], [80.0, 1000.0])
        self.assertEqual([row["transaction_type"] for row in rows], ["expense", "income"])

    def test_csv_debit_and_credit_columns_keep_direction(self):
        csv = "Date,Description,Debit,Credit,Balance\n01/08/2026,Cafe,80.00,,95.46\n02/08/2026,Salary,,1000.00,1095.46\n"
        rows = rows_from_csv(csv)
        self.assertEqual(rows[0]["amount"], 80.0)
        self.assertEqual(rows[0]["transaction_type"], "expense")
        self.assertEqual(rows[1]["amount"], 1000.0)
        self.assertEqual(rows[1]["transaction_type"], "income")

    def test_malformed_amount_is_safe_and_oversized_amount_is_ignored(self):
        self.assertEqual(parse_amount(".08551.."), 8551.0)
        self.assertEqual(parse_amount("99,999,999,999,999.00"), 0)
        self.assertEqual(parse_amount("9,999,999,999.99"), MAX_TRANSACTION_AMOUNT)


if __name__ == "__main__":
    unittest.main()
