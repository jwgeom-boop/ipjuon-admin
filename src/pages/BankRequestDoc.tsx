import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import RequestDocPrint, { RequestKind } from "@/components/bank/RequestDocPrint";
import RepaymentInquiryPrint from "@/components/bank/RepaymentInquiryPrint";

export default function BankRequestDoc() {
  const { kind } = useParams<{ kind: string }>();

  const payload = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("bank_request_doc_payload");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  if (!payload || (kind !== "balance" && kind !== "interim" && kind !== "repayment")) {
    return <Navigate to="/bank" replace />;
  }

  if (kind === "repayment") {
    return (
      <RepaymentInquiryPrint
        bankName={payload.bankName || ""}
        bankBranch={payload.bankBranch || ""}
        complexFullName={payload.complexFullName || ""}
        bankManager={payload.bankManager || ""}
        bankPhone={payload.bankPhone || ""}
        bankFax={payload.bankFax || ""}
        rows={payload.rows || []}
      />
    );
  }

  return (
    <RequestDocPrint
      kind={kind as RequestKind}
      bankName={payload.bankName || ""}
      complexFullName={payload.complexFullName || ""}
      bankManager={payload.bankManager || ""}
      bankPhone={payload.bankPhone || ""}
      bankFax={payload.bankFax || ""}
      rows={payload.rows || []}
    />
  );
}
