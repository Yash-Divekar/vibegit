from typing import List, Complex
import cmath


def solve_quadratic(a: float, b: float, c: float) -> List[float]:
    discriminant = b**2 - 4*a*c
    if discriminant < 0:
        return []  # No real solutions
    elif discriminant == 0:
        return [-b / (2 * a)]  # One real solution
    else:
        root1 = (-b + discriminant**0.5) / (2 * a)
        root2 = (-b - discriminant**0.5) / (2 * a)
        return [root1, root2]  # Two real solutions


def solve_cubic(a: float, b: float, c: float, d: float) -> List[Complex]:
    # Using Cardano's method for simplicity
    if a == 0:
        return solve_quadratic(b, c, d)  # If it's not cubic, fallback
    f = ((3*c/a) - ((b**2)/(a**2))) / 3
    g = ((2*(b**3))/(a**3) - (9*b*c)/(a**2) + (27*d/a)) / 27
    h = (g**2)/4 + (f**3)/27

    if h > 0:
        # One real root
        r = -(g/2) + cmath.sqrt(h)
        s = abs(r)**(1/3) * (1 if r >= 0 else -1)
        t = -(g/2) - cmath.sqrt(h)
        u = abs(t)**(1/3) * (1 if t >= 0 else -1)
        root = (s + u) - (b/(3*a))
        return [root]  # Return the single real root
    elif f == 0 and g == 0 and h == 0:
        root = - (b / (3*a))
        return [root]  # Triple root
    else:
        # Three real roots
        # Using trigonometric methods or numerical methods could be applied here (not detailed)
        return []  # Placeholder for real roots computation


import unittest


class TestEquationSolver(unittest.TestCase):
    def test_solve_quadratic(self):
        self.assertEqual(solve_quadratic(1, -3, 2), [2, 1])
        self.assertEqual(solve_quadratic(1, 0, -4), [2, -2])

    def test_solve_cubic(self):
        self.assertEqual(solve_cubic(1, -6, 11, -6), [3, 2, 1])  # Example case
    