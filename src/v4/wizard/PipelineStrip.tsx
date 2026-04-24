import { useNavigate } from "react-router-dom";
import { StageStrip, Stage } from "./StageStrip";

const STAGES: Stage[] = [
  { label: "상담" },
  { label: "예약" },
  { label: "자서" },
  { label: "실행" },
];

const ROUTES = ["consultation", "reservation", "signing", "execution"] as const;

export function PipelineStrip({
  current,
  caseId,
}: {
  current: 0 | 1 | 2 | 3;
  caseId: string;
}) {
  const navigate = useNavigate();
  return (
    <StageStrip
      stages={STAGES}
      current={current}
      onJump={(i) => {
        if (i === current) return;
        navigate(`/v4/wizard/${ROUTES[i]}/${caseId}`);
      }}
    />
  );
}
