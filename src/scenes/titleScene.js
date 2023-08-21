import { median } from '../utils/medians'

// Do note that this ignores valid fractional refresh rates
// (e.g. my lab monitor reports 74.89 Hz, not 75), so we shouldn't rely on this
// for actual timing, only estimates (is it even worth guessing, then?)
const common_refresh_rates = [30, 60, 72, 75, 85, 90, 100, 120, 144, 240]
const FRAMES_TO_STORE = 400

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }
  preload() {
    this.load.image('cursor', 'assets/cursor.png')
    this.load.image('mouse', 'assets/mouse.jpg')
    this.load.image('touchscreen', 'assets/touchscreen.jpg')
    this.load.image('trackball', 'assets/trackball.jpg')
    this.load.image('trackpad', 'assets/trackpad.jpg')
    this.load.image('y', 'assets/check.png')
    this.load.image('n', 'assets/x.png')
  }
  create() {
    let height = this.game.config.height
    let center = height / 2
    this.frame_times = Array(FRAMES_TO_STORE).fill(0) // let's guess the frame rate

    this.i = 0

    let cb = (side) => {
      left.disableInteractive()
      right.disableInteractive()
      !DEBUG && this.scale.startFullscreen()
      this.tweens.addCounter({
        from: 255,
        to: 0,
        duration: 2000,
        onUpdate: (t) => {
          let v = Math.floor(t.getValue())
          this.cameras.main.setAlpha(v / 255)
        },
        onComplete: () => {
          // grab frame times now, so we'll have at least ~2.5 sec of data
          let dts = this.frame_times.map((ele, idx, arr) => ele - arr[idx - 1]).slice(1)
          let est_rate = 1000 / median(dts)
          let refresh_success = true
          if (!isFinite(est_rate)) {
            console.warn('Not enough time to guess a refresh rate, defaulting to 60 Hz.')
            est_rate = 60
            refresh_success = false
          }
          console.log(`median: ${est_rate}`)
          this.game.user_config['hand'] = side
          this.game.user_config['refresh_rate_est'] = est_rate
          this.game.user_config['refresh_rate_measured'] = refresh_success
          // TODO: https://docs.google.com/document/d/17pvFMFqtAIx0ZA6zMZRU_A2-VnjhNX9QlN1Cgy-3Wdg/edit
          this.input.mouse.requestPointerLock()
          let battery_config = {
            has_api: false,
            charging: false
          }
          if (navigator.getBattery) {
            // we actually have battery status
            navigator.getBattery().then(battery => {
              battery_config['has_api'] = true
              battery_config['charging'] = battery.charging
              // all other fields are not useful AFAIK
              this.game.user_config['battery'] = battery_config
              this.scene.start('MainScene')
            })
          } else {
            // who knows about battery
            this.game.user_config['battery'] = battery_config
            this.scene.start('MainScene')
          }
        }
      })
    }

    this.add.rectangle(center - 6, center + 100, 6, 500, 0xffffff)

    this.add.rexBBCodeText(center, 120, 'If using a laptop,\nplease plug into a wall outlet\nbefore continuing for best performance.', {
      fontFamily: 'Verdana',
      fontStyle: 'bold',
      fontSize: 40,
      color: '#dddddd',
      stroke: '#444444',
      strokeThickness: 6,
      align: 'center',
      backgroundColor: '#460000',
      padding: {left: 5, right: 5, top: 5, bottom: 5}
    }).setOrigin(0.5, 0.5)

    this.add.text(center, 270, 'Select one option below to start\n (will enter fullscreen).', {
      fontFamily: 'Verdana',
      fontSize: 32,
      color: '#bbbbbb',
      stroke: '#444444',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5, 0.5)

    let left = this.add.
      text(center - 250, center + 100, 'Click this side\nif using the mouse\nwith your left hand.', {
        fontFamily: 'Verdana',
        fontSize: 32,
        color: '#dddddd',
        stroke: '#444444',
        strokeThickness: 2,
        align: 'center'
      }).
      setOrigin(0.5, 0.5).
      setInteractive().
      once('pointerdown', () => {
        cb('left')
      })
    let right = this.add.
      text(center + 250, center + 100, 'Click this side\nif using the mouse\nwith your right hand.', {
        fontFamily: 'Verdana',
        fontSize: 32,
        color: '#dddddd',
        stroke: '#444444',
        strokeThickness: 2,
        align: 'center'
      }).
      setOrigin(0.5, 0.5).
      setInteractive().
      once('pointerdown', () => {
        cb('right')
      })
  }
  update() {
    // this.game.loop.now should be rAF timestamp, if using my fork
    // otherwise it's a timestamp taken immediately after entering
    // the rAF callback, which introduces delay and jitter (sometimes up several ms in both cases),
    // and is lower resolution depending on the Spectre/Meltdown mitigations
    // in place on the particular browser
    this.frame_times[this.i] = this.game.loop.now
    this.i++
    this.i %= FRAMES_TO_STORE
  }
}
