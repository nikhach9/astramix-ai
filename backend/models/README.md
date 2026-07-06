Place the trained strength-prediction model artifact here
(default expected filename: `strength_model.pkl`).

It is loaded lazily and cached by `app/ml/model_loader.py`. If the file
is missing, `/predict-strength` falls back to a heuristic estimate so
the API stays usable during development — don't rely on it for real
predictions until the actual model is in place.
