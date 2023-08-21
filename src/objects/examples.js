//
import make_thick_arc from '../utils/arc'
const WHITE = 0xffffff
const LIGHTBLUE = 0x86c5da
const GREEN = 0x09ce0e // actually move to the target
const MAGENTA = 0xf666bd
const RED = 0xff0000
const GRAY = 0x666666
const TARGET_SIZE_RADIUS = 20
const TARGET_OUTER_RADIUS = 30

export default class BasicExample extends Phaser.GameObjects.Container {
  // vis cursor + target
  constructor(scene, x, y, has_feedback = true, clamp = false) { // clamp is going to be exaggerated ~5 degrees
    let target = scene.add.circle(0, -100, TARGET_SIZE_RADIUS, GREEN)
    let cur = scene.add.circle(0, 100, 8, LIGHTBLUE, has_feedback)
    let center = scene.add.circle(0, 100, 15, WHITE)

    target.visible = false

    let img_cur = scene.add.image(0, 100, 'cursor').setOrigin(0, 0).setScale(0.2)


    let stims = [target, cur, center, img_cur]
    super(scene, x, y, stims)
    let xp = 0
    let yp = -100

    let rad = Phaser.Math.DegToRad(270-6) // implementing a fake clamp
    let xc = 200*Math.cos(rad)
    let yc = 200*Math.sin(rad) + 100

    scene.add.existing(this)
    this.tl1 = scene.tweens.timeline({
      loop: -1,
      loopDelay: 0,
      paused: true,
      tweens: [
        // start with green target
        {
          targets: target,
          y: -100,
          ease: 'Linear',
          duration: 200,
          onStart: () => {
            center.visible = true
          },
          onComplete: () => {
              center.visible = false
              target.visible = true
          }
        },
        // then move cursor through target
        {
          offset: 600,
          targets: img_cur,
          x: xp,
          y: yp-50,
          ease: 'Power2',
          duration: 300
        },
        // move this cursor through target too
        {
          offset: 600,
          targets: cur,
          x: clamp ? xc : xp,
          y: clamp ? yc : yp,
          ease: 'Power2',
          duration: 300,
            onStart: () => {
                target.fillColor = GREEN
                target.visible = true
                center.visible = false
          },
            onComplete: () => {
                target.fillColor = GREEN
                target.visible = true
                center.visible = false
          }
          },
        //reset the cursor
        {
            offset: 1400,
            targets: img_cur,
            x: 0,
            y: 100,
            ease: 'Power2',
            duration: 100,
            onStart: () => {
                center.visible = true
                target.visible = false
            },
            onComplete: () => {
                center.visible = true
                target.visible = false 
            }
        },
        {
            offset: 1400,
            targets: cur,
            x: 0,
            y: 100,
            ease: 'Power2',
            duration: 100,
            onComplete: () => {
                this.counter = 0
            }
        },
        // turn the on other target
        {
          offset: 2000,
          targets: target,
          y: -100,
          ease: 'Linear',
          duration: 200,
            onStart: () => {
            target.fillColor = GREEN
            target.visible = true
            center.visible = false
            
          },
          onComplete: () => {
            target.fillColor == GREEN
            target.visible = true
            center.visible = false
          }
        },
        // move this cursor through target too
        {
          offset: 2000 + 200,
          targets: img_cur,
          x: xp,
          y: yp-50,
          ease: 'Power2',
          duration: 300,
          onStart: () => {
            center.visible = false
          },
          onComplete: () => {
            center.visible = false
          }
          },
          {
              offset: 2000 + 200,
              targets: cur,
              x: clamp ? xc : xp,
              y: clamp ? yc : yp,
              ease: 'Power2',
              duration: 300,
              onStart: () => {
                  center.visible = false
              },
              onComplete: () => {
                  center.visible = false
              }
          },
          //reset the cursor
          {
              offset: 2900,
              targets: img_cur,
              x: 0,
              y: 100,
              ease: 'Power2',
              duration: 100,
              onStart: () => {
                  target.visible = false
                  center.visible = true
              },
              onComplete: () => {
                  target.visible = false
                  center.visible = true
              }
          },
          {
              offset: 2900,
              targets: cur,
              x: 0,
              y: 100,
              ease: 'Power2',
              duration: 100,
              onComplete: () => {
                  target.visible = false
                  center.visible = true
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
