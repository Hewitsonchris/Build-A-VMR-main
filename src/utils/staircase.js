// one up, n down
// fixed step size
// see e.g. https://link.springer.com/content/pdf/10.3758/BF03194543.pdf
import { clamp } from './clamp'

export class Staircase {
  constructor(min_val, max_val, step_size, n_down = 2) {
    this.min_val = min_val
    this.max_val = max_val
    this.step_size = step_size
    this.current_val = max_val // always start at top
    this.n_down = n_down
    this.correct_count = 0
    // this.history = [] // {stim: val, correct: t/f}
  }

  next() {
    return this.current_val
  }

  update(correct) {
    // this.history.push({stim: this.current_val, correct: correct})
    if (correct) {
      this.correct_count += 1
      if (this.correct_count >= this.n_down) {
        this.correct_count = 0
        this.current_val = clamp(this.current_val - this.step_size, this.min_val, this.max_val)
      }
    } else {
      this.correct_count = 0
      this.current_val = clamp(this.current_val + this.step_size, this.min_val, this.max_val)
    }
  }
}
