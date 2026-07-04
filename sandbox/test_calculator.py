import unittest
from calculator import logarithm, sine, cosine, tangent

class TestCalculator(unittest.TestCase):

    def test_logarithm(self):
        self.assertAlmostEqual(logarithm(10, 100), 2)
        self.assertAlmostEqual(logarithm(2, 8), 3)
        with self.assertRaises(ValueError):
            logarithm(1, 10)
        with self.assertRaises(ValueError):
            logarithm(-2, 10)
        with self.assertRaises(ValueError):
            logarithm(10, -5)

    def test_sine(self):
        self.assertAlmostEqual(sine(90), 1)
        self.assertAlmostEqual(sine(0), 0)

    def test_cosine(self):
        self.assertAlmostEqual(cosine(0), 1)
        self.assertAlmostEqual(cosine(90), 0)

    def test_tangent(self):
        self.assertAlmostEqual(tangent(45), 1)
        with self.assertRaises(ValueError):
            tangent(90)  # Undefined tangent

if __name__ == '__main__':
    unittest.main()