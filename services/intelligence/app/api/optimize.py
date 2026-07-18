from fastapi import APIRouter
from pydantic import BaseModel
from app.ml.optimizer import BayesianOptimizer

router = APIRouter(prefix="/optimize", tags=["Optimization"])


class OptimizeRequest(BaseModel):
    target_metric: str = "sharpe_ratio"
    constraints: dict | None = None
    portfolio_id: str | None = None


@router.post("")
async def run_optimization(request: OptimizeRequest):
    optimizer = BayesianOptimizer()
    return optimizer.optimize(
        target_metric=request.target_metric,
        constraints=request.constraints,
    )


@router.get("/params")
async def get_current_params():
    optimizer = BayesianOptimizer()
    return {
        "current_params": optimizer.default_params,
        "available_metrics": [
            "sharpe_ratio",
            "max_drawdown",
            "win_rate",
            "profit_factor",
            "calmar_ratio",
        ],
    }
