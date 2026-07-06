import sys
import os
from pathlib import Path

# Add src to sys.path so it works without PYTHONPATH if needed
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(SCRIPT_DIR.parent / "src"))

from astramix.training.strength import train_strength_models

def main():
    print("--- AstraMix v0.1 Strength Model Training Pipeline ---")
    
    # Paths assuming script is run from anywhere and resolves relative to the repo root
    dataset_path = PROJECT_ROOT / "data" / "processed" / "strength_dataset_v0_1.csv"
    artifacts_dir = PROJECT_ROOT / "artifacts"
    
    print(f"Dataset Path: {dataset_path.resolve()}")
    print(f"Artifact Output Path: {artifacts_dir.resolve()}")
    
    if not dataset_path.exists():
        print(f"Error: Dataset not found at {dataset_path}")
        sys.exit(1)
        
    print("\nStarting training...\n")
    
    try:
        metrics_df, metadata = train_strength_models(dataset_path, artifacts_dir)
    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)
        
    print("--- Training Complete ---")
    print("\nMetrics Table:")
    print(metrics_df.to_string(index=False))
    
    print(f"\nBest Model by RMSE: {metadata['best_model_name']}")
    print("Metadata and model artifacts successfully saved to:")
    print(Path(metadata["metrics_path"]).parent)

if __name__ == "__main__":
    main()
