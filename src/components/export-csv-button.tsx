import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, rowsToCsv, type CsvColumn } from "@/lib/csv";

type Props<T> = {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[];
  disabled?: boolean;
};

export function ExportCsvButton<T>({ filename, columns, rows, disabled }: Props<T>) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCsv(filename, rowsToCsv(columns, rows))}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
