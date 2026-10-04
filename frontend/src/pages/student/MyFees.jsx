import { Wallet } from "lucide-react";
import StudentScope from "../../components/StudentScope";
import EmptyState from "../../components/EmptyState";
import { useApi } from "../../useApi";

const STATUS_STYLE = {
  UNPAID: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
};
const money = (n) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const methodName = (m) => {
  const s = m.replace("_", " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function View({ student }) {
  const { data, loading, error } = useApi(`/fees/student/${student.id}`);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const { fees, totals } = data;
  const cards = [
    ["Total billed", money(totals.billed), "text-slate-800"],
    ["Paid", money(totals.paid), "text-green-700"],
    ["Balance due", money(totals.balance), totals.balance > 0 ? "text-red-700" : "text-green-700"],
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(([name, value, tone]) => (
          <div key={name} className="rounded-lg border border-slate-200 bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{name}</div>
            <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      {fees.length === 0 && (
        <EmptyState icon={Wallet} message="No fees have been added yet." />
      )}

      {fees.map((fee) => (
        <div key={fee.id} className="mb-4 rounded-lg border border-slate-200 bg-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-800">{fee.title}</h2>
              <p className="text-xs text-slate-500">Due {fee.dueDate.slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-2">
              {fee.overdue && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                  Overdue
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[fee.status]}`}
              >
                {fee.status.charAt(0) + fee.status.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Amount</div>
              {money(fee.amount)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Paid</div>
              {money(fee.paid)}
            </div>
            <div>
              <div className="text-xs text-slate-500">Balance</div>
              {money(fee.balance)}
            </div>
          </div>
          {fee.payments.length > 0 && (
            <ul className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
              {fee.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-0.5">
                  <span>
                    {p.paidAt.slice(0, 10)} · {methodName(p.method)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <span>{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyFees() {
  return <StudentScope title="Fees">{(student) => <View student={student} />}</StudentScope>;
}