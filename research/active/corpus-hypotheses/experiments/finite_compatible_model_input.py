"""Frozen inputs for the first complete finite compatible-distinctions models."""


MODELS = {
    "cycle8": tuple((index, (index + 1) % 8, (index + 2) % 8) for index in range(8)),
    "two_cycles4": tuple(
        (offset + index, offset + ((index + 1) % 4), offset + ((index + 2) % 4))
        for offset in (0, 4)
        for index in range(4)
    ),
}

TRANSPORTS = tuple(
    tuple(
        tuple(((-1 if (vertex >> axis) & 1 else 1) if row == axis else 0) for axis in range(3))
        for row in range(3)
    )
    for vertex in range(8)
)
