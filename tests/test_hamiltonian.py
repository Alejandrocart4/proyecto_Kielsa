import unittest

from branches import build_real_route_blocks
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

    def test_real_blocks_have_all_branches_and_a_starting_cycle(self):
        blocks = build_real_route_blocks()
        self.assertEqual([len(block["nodes"]) for block in blocks], [19, 19, 14])
        self.assertEqual(sum(len(block["nodes"]) for block in blocks), 52)
        for block in blocks:
            selected_start = block["nodes"][-1]["id"]
            result = analyze_block(block, selected_start)
            self.assertIsNotNone(result["cycle"])
            self.assertEqual(len(result["cycle"]["path"]), len(block["nodes"]) + 1)
            self.assertEqual(result["cycle"]["path"][0], selected_start)
            self.assertEqual(result["cycle"]["path"][-1], selected_start)


if __name__ == "__main__":
    unittest.main()
