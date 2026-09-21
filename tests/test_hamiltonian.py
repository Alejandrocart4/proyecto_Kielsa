import unittest

from hamiltonian import analyze_block


class HamiltonianTests(unittest.TestCase):
    def test_square_cycle_and_criteria(self):
        block = {
            "nodes": [{"id": item} for item in "ABCD"],
            "edges": [
                {"from": "A", "to": "B", "weight": 2},
                {"from": "B", "to": "C", "weight": 1},
                {"from": "C", "to": "D", "weight": 3},
                {"from": "D", "to": "A", "weight": 4},
            ],
        }
        result = analyze_block(block, "A")
        self.assertEqual(result["cycle"]["path"], ["A", "B", "C", "D", "A"])
        self.assertEqual(result["cycle"]["total_weight"], 10)
        self.assertTrue(result["criteria"]["dirac"])
        self.assertTrue(result["criteria"]["ore"])


if __name__ == "__main__":
    unittest.main()
