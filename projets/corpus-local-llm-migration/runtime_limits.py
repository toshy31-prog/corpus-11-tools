"""Limites partagées par la configuration du moteur et son panneau de ressources."""
CONTEXT_TOKENS = 16384
OUTPUT_TOKENS = 2048
# Keep an already requested model and its prompt cache through a working pause.
# This does not preload it. llama-swap still unloads it after idle expiry.
MAIN_MODEL_IDLE_SECONDS = 1800
# Work around the fused MMVQ launch seen in scoped-cuda-crash.log.
# This disables kernel fusion, not CUDA or GPU layer placement.
CUDA_DISABLE_FUSION = True
