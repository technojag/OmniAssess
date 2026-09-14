from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List
import math

app = FastAPI(
    title="OmniAssess ML Service",
    description="IRT-inspired theta estimation and prototype readiness scoring. Not a certified psychometric engine.",
    version="0.1.0",
)


class ResponseItem(BaseModel):
    a: float = Field(..., description="discrimination")
    b: float = Field(..., description="difficulty")
    correct: bool


class ThetaRequest(BaseModel):
    responses: List[ResponseItem]


class ThetaResponse(BaseModel):
    theta: float
    se: float
    method: str
    limitations: str


def sigmoid(x: float) -> float:
    if x < -20:
        return 0.0
    if x > 20:
        return 1.0
    return 1.0 / (1.0 + math.exp(-x))


def p_correct(theta: float, a: float, b: float) -> float:
    return sigmoid(a * (theta - b))


@app.get("/health")
def health():
    return {"ok": True, "service": "omniassess-ml", "label": "IRT-inspired prototype"}


@app.post("/estimate-theta", response_model=ThetaResponse)
def estimate_theta(body: ThetaRequest):
    grid = [(-3.0 + 6.0 * i / 60) for i in range(61)]
    weights = []
    for t in grid:
        prior = math.exp(-0.5 * t * t) / math.sqrt(2 * math.pi)
        like = prior
        for r in body.responses:
            p = p_correct(t, r.a, r.b)
            like *= p if r.correct else (1 - p)
        weights.append(like)
    s = sum(weights) or 1.0
    mean = sum(w * t for w, t in zip(weights, grid)) / s
    m2 = sum(w * t * t for w, t in zip(weights, grid)) / s
    var = max(0.01, m2 - mean * mean)
    return ThetaResponse(
        theta=mean,
        se=math.sqrt(var),
        method="EAP-2PL-grid",
        limitations="Prototype EAP on a normal prior. Small n yields high SE. Not comparable to commercial CAT scores.",
    )


class ReadinessRequest(BaseModel):
    mastery_avg: float
    recent_accuracy: float
    theta_norm: float
    consistency: float
    activity: float
    interview: float


@app.post("/readiness")
def readiness(body: ReadinessRequest):
    dims = {
        "problem_solving": clamp(0.4 * body.theta_norm + 0.6 * body.recent_accuracy),
        "data_structures": clamp(body.mastery_avg),
        "algorithms": clamp(0.5 * body.mastery_avg + 0.5 * body.theta_norm),
        "complexity": clamp(0.3 * body.mastery_avg + 0.4 * body.theta_norm + 0.3 * body.recent_accuracy),
        "systems": clamp(0.5 * body.mastery_avg + 0.5 * body.activity),
        "communication": clamp(body.interview),
    }
    overall = clamp(
        0.28 * dims["problem_solving"]
        + 0.22 * dims["data_structures"]
        + 0.2 * dims["algorithms"]
        + 0.12 * dims["complexity"]
        + 0.1 * dims["systems"]
        + 0.08 * dims["communication"]
    )
    if overall < 0.35:
        band = "NOT_READY"
    elif overall < 0.5:
        band = "DEVELOPING"
    elif overall < 0.7:
        band = "ON_TRACK"
    elif overall < 0.85:
        band = "READY"
    else:
        band = "HIGHLY_READY"
    return {
        "overall": overall,
        "band": band,
        "dimensions": dims,
        "limitations": "Linear blend, not a trained production classifier. No 99.9% accuracy claims.",
    }


class RankItem(BaseModel):
    slug: str
    mastery: float
    attempts: int


@app.post("/rank-recommendations")
def rank(items: List[RankItem]):
    scored = []
    for it in items:
        score = (1 - it.mastery) * (1.2 if it.attempts < 3 else 1.0)
        scored.append({"slug": it.slug, "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"ranked": scored, "limitations": "Heuristic ranking from mastery and attempt counts only."}


def clamp(x: float) -> float:
    return max(0.0, min(1.0, x))
