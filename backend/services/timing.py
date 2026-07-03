import logging
import time
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("briefr.timing")

_enabled: ContextVar[bool] = ContextVar("timing_enabled", default=False)
_pipeline_stage: ContextVar[str] = ContextVar("timing_pipeline_stage", default="unknown")


@dataclass
class TimingRecord:
    kind: str
    name: str
    duration_s: float
    timestamp: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class ResearchProfiler:
    def __init__(self) -> None:
        self._records: List[TimingRecord] = []
        self._pipeline_started_at: Optional[float] = None
        self._api_call_count = 0
        self._depth: str = "unknown"

    def _tag(self) -> str:
        return f"{self._depth.upper()} TIMING"

    def begin(self, depth: str, question: str) -> None:
        self._records = []
        self._api_call_count = 0
        self._depth = depth
        self._pipeline_started_at = time.perf_counter()
        _enabled.set(True)
        logger.info(
            "[%s] pipeline_start depth=%s question=%r",
            self._tag(),
            depth,
            question[:120],
        )

    def end(self) -> List[TimingRecord]:
        _enabled.set(False)
        _pipeline_stage.set("unknown")
        return list(self._records)

    def enabled(self) -> bool:
        return _enabled.get()

    def set_stage(self, stage: str) -> None:
        if self.enabled():
            _pipeline_stage.set(stage)

    def current_stage(self) -> str:
        return _pipeline_stage.get()

    def record_stage(self, stage: str, duration_s: float, **metadata: Any) -> None:
        if not self.enabled():
            return
        self._records.append(
            TimingRecord(
                kind="stage",
                name=stage,
                duration_s=duration_s,
                timestamp=_timestamp(),
                metadata=metadata,
            )
        )
        logger.info(
            "[%s] stage=%s duration=%.2fs %s",
            self._tag(),
            stage,
            duration_s,
            _format_metadata(metadata),
        )

    def record_api_call(
        self,
        *,
        grounded: bool,
        model: str,
        attempt: int,
        duration_s: float,
        success: bool,
        error: Optional[str] = None,
        **metadata: Any,
    ) -> None:
        if not self.enabled():
            return
        self._api_call_count += 1
        call_name = f"gemini_call_{self._api_call_count}"
        meta = {
            "pipeline_stage": self.current_stage(),
            "grounded": grounded,
            "model": model,
            "attempt": attempt,
            "success": success,
            **metadata,
        }
        if error:
            meta["error"] = error[:200]
        self._records.append(
            TimingRecord(
                kind="api",
                name=call_name,
                duration_s=duration_s,
                timestamp=_timestamp(),
                metadata=meta,
            )
        )
        logger.info(
            "[%s] %s stage=%s grounded=%s model=%s attempt=%s duration=%.2fs success=%s %s",
            self._tag(),
            call_name,
            meta["pipeline_stage"],
            grounded,
            model,
            attempt,
            duration_s,
            success,
            _format_metadata({k: v for k, v in meta.items() if k not in {"pipeline_stage", "grounded", "model", "attempt", "success"}}),
        )

    def record_idle(self, name: str, duration_s: float, **metadata: Any) -> None:
        if not self.enabled():
            return
        self._records.append(
            TimingRecord(
                kind="idle",
                name=name,
                duration_s=duration_s,
                timestamp=_timestamp(),
                metadata=metadata,
            )
        )
        logger.info(
            "[%s] idle=%s duration=%.2fs %s",
            self._tag(),
            name,
            duration_s,
            _format_metadata(metadata),
        )

    def record_note(self, name: str, **metadata: Any) -> None:
        if not self.enabled():
            return
        self._records.append(
            TimingRecord(
                kind="note",
                name=name,
                duration_s=0.0,
                timestamp=_timestamp(),
                metadata=metadata,
            )
        )
        logger.info(
            "[%s] note=%s %s",
            self._tag(),
            name,
            _format_metadata(metadata),
        )

    def log_summary(self) -> None:
        if not self._records or self._pipeline_started_at is None:
            return

        total_s = time.perf_counter() - self._pipeline_started_at
        api_records = [r for r in self._records if r.kind == "api"]
        stage_records = [r for r in self._records if r.kind == "stage"]
        idle_records = [r for r in self._records if r.kind == "idle"]
        successful_api = [r for r in api_records if r.metadata.get("success")]

        api_total = sum(r.duration_s for r in successful_api)
        idle_total = sum(r.duration_s for r in idle_records)
        stage_total = sum(r.duration_s for r in stage_records)
        retry_failures = [r for r in api_records if not r.metadata.get("success")]

        tag = self._tag()
        logger.info("[%s] ========== SUMMARY ==========", tag)
        logger.info("[%s] total_pipeline=%.2fs", tag, total_s)
        logger.info(
            "[%s] successful_api_calls=%s failed_attempts=%s",
            tag,
            len(successful_api),
            len(retry_failures),
        )
        logger.info(
            "[%s] time_in_successful_api=%.2fs (%.0f%%)",
            tag,
            api_total,
            (api_total / total_s * 100) if total_s else 0,
        )
        logger.info(
            "[%s] time_in_idle_waits=%.2fs (%.0f%%)",
            tag,
            idle_total,
            (idle_total / total_s * 100) if total_s else 0,
        )
        logger.info(
            "[%s] time_in_stage_wrappers=%.2fs unaccounted=%.2fs",
            tag,
            stage_total,
            max(0.0, total_s - api_total - idle_total),
        )

        logger.info("[%s] --- per-stage ---", tag)
        for record in stage_records:
            logger.info(
                "[%s]   stage %-22s %.2fs %s",
                tag,
                record.name,
                record.duration_s,
                _format_metadata(record.metadata),
            )

        logger.info("[%s] --- per-api-call (successful) ---", tag)
        for record in successful_api:
            meta = record.metadata
            logger.info(
                "[%s]   %-16s stage=%-10s grounded=%-5s model=%-22s %.2fs",
                tag,
                record.name,
                meta.get("pipeline_stage"),
                str(meta.get("grounded")),
                meta.get("model"),
                record.duration_s,
            )

        if retry_failures:
            logger.info("[%s] --- failed/retry attempts ---", tag)
            for record in retry_failures:
                meta = record.metadata
                logger.info(
                    "[%s]   attempt failed stage=%s model=%s attempt=%s duration=%.2fs error=%s",
                    tag,
                    meta.get("pipeline_stage"),
                    meta.get("model"),
                    meta.get("attempt"),
                    record.duration_s,
                    meta.get("error"),
                )

        if idle_records:
            logger.info("[%s] --- idle waits ---", tag)
            for record in idle_records:
                logger.info(
                    "[%s]   idle %-20s %.2fs %s",
                    tag,
                    record.name,
                    record.duration_s,
                    _format_metadata(record.metadata),
                )

        logger.info("[%s] ===============================", tag)


profiler = ResearchProfiler()


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _format_metadata(metadata: Dict[str, Any]) -> str:
    if not metadata:
        return ""
    parts = [f"{key}={value}" for key, value in metadata.items()]
    return " ".join(parts)