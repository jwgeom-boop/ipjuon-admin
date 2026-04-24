import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// 가장 긴 prefix 우선 매칭 (e.g. "/v4/wizard/consultation" 이 "/v4" 보다 먼저).
const TITLE_RULES: { prefix: string; title: string }[] = [
  { prefix: "/v4/wizard/consultation", title: "상담 위저드" },
  { prefix: "/v4/wizard/reservation", title: "자서예약 위저드" },
  { prefix: "/v4/wizard/signing", title: "자서 위저드" },
  { prefix: "/v4/wizard/execution", title: "대출실행 위저드" },
  { prefix: "/v4/change-password", title: "비밀번호 변경" },
  { prefix: "/v4/team", title: "팀 대시보드" },
  { prefix: "/v4/legacy", title: "구버전 홈" },
  { prefix: "/v4", title: "오늘의 리스트" },
  { prefix: "/bank/request", title: "서류 요청" },
  { prefix: "/bank/settlement", title: "정산" },
  { prefix: "/bank", title: "은행 상담사" },
  { prefix: "/dashboard", title: "대시보드" },
  { prefix: "/consultation", title: "상담신청 관리" },
  { prefix: "/vendors", title: "업체 관리" },
  { prefix: "/notices", title: "공지사항" },
  { prefix: "/invites", title: "초대 발송 내역" },
  { prefix: "/login", title: "로그인" },
];

const SUFFIX = " · 입주ON";

export const RouteTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const match = TITLE_RULES.find((r) => pathname.startsWith(r.prefix));
    document.title = match ? `${match.title}${SUFFIX}` : `입주ON 관리자`;
  }, [pathname]);
  return null;
};
