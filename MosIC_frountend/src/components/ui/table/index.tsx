import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
} from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  isHeader?: boolean;
};

export function Table({ className = "", ...props }: TableProps) {
  return (
    <table
      {...props}
      className={`w-full border-collapse text-left ${className}`}
    />
  );
}

export function TableHeader({ className = "", ...props }: TableSectionProps) {
  return <thead {...props} className={className} />;
}

export function TableBody({ className = "", ...props }: TableSectionProps) {
  return <tbody {...props} className={className} />;
}

export function TableRow({ className = "", ...props }: TableRowProps) {
  return <tr {...props} className={className} />;
}

export function TableCell({
  isHeader,
  className = "",
  ...props
}: TableCellProps) {
  if (isHeader) {
    return <th {...props} className={className} scope="col" />;
  }
  return <td {...props} className={className} />;
}

