//NASER: defunct example class

const WHITE = 0xffffff
const GREEN = 0x39ff14 // actually move to the target
const GRAY = 0x666666
const TARGET_SIZE_RADIUS = 30
const LEFT = '⇦'
const RIGHT = '⇨'


export default class SideExample extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    let target = scene.add.circle(0, -100, TARGET_SIZE_RADIUS, GRAY)
    let center = scene.add.circle(0, 100, 15, WHITE)
    let left = scene.add.text(0, 0, LEFT, {
      fontStyle: 'bold',
      fontFamily: 'Verdana',
      fontSize: 70,
      color: '#ffff00'
    }).setAlpha(0).setOrigin(0.5, 0.5)

    let right = scene.add.text(0, 0, RIGHT, {
      fontFamily: 'Verdana',
      fontStyle: 'bold',
      fontSize: 70,
      color: '#ffff00'
    }).setAlpha(0).setOrigin(0.5, 0.5)


    let stims = [target, center, left, right]

    super(scene, x, y, stims)
    scene.add.existing(this)
    this.tl1 = scene.tweens.timeline({
      loop: -1,
      loopDelay: 1000,
      paused: true,
      tweens: [

        // show button press
        {
          offset: 200 + 500,
          targets: left,
          alpha: 1,
          duration: 300,
          yoyo: true,
          onComplete: () => {
            star.alpha = 0
          }
        },

        // show button press
        {
          offset: 1000 + 200 + 500 + 200 + 500,
          targets: right,
          alpha: 1,
          duration: 300,
          yoyo: true,
          onComplete: () => {
            star.alpha = 0
          }
        }
      ]
    })
  }
  play() {
    this.tl1.play()
    this.tl1.resume()
  }
  stop() {
    this.tl1.pause()
  }
}
