// all done, send the data
import postData from '../utils/postdata'
import { onBeforeUnload } from '../game'

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' })
  }
  create(today_data) {
    let height = this.game.config.height
    let center = height / 2
    let id = this.game.user_config.id
    let is_sona = this.game.user_config.is_sona
    this.scale.stopFullscreen()
    let extra_txt = is_sona ? '.' : ' (will redirect within\n10 seconds after selection).'
    let last_q = this.add.
      text(center, 100, `Last question!\nSelect which input device\nyou used${extra_txt}`, {
        fontFamily: 'Verdana',
        fontSize: 20,
        align: 'center'
      }).
      setOrigin(0.5, 0.5)

    let mostly = 'https://google.com/?cc='

    if (this.game.user_config.is_prolific) {
      mostly = 'https://app.prolific.co/submissions/complete?cc='
    } else if (is_sona) {
      mostly = `https://yale.sona-systems.com/webstudy_credit.aspx?experiment_id=1479&credit_token=762ab607160043e58dd4ba6e9e1b288d&survey_code=${id}`
    }

    function postSelection(scene) {
      let alldata = { config: scene.game.user_config, data: today_data }

      if (!is_sona) {
        window.removeEventListener('beforeunload', onBeforeUnload)
        Promise.all(postData(alldata)).then((values) => {
          window.location.href = mostly + '8E059F9A'
        })
      } else {
        // allow option to download the debrief
        //
        last_q.visible = false
        scene.add.
          text(center, center - 100, 'Click here to download\nthe debriefing.', {
            fontFamily: 'Verdana',
            fontStyle: 'bold',
            fontSize: 40,
            color: '#dddddd',
            stroke: '#444444',
            strokeThickness: 4,
            align: 'center'
          }).
          setOrigin(0.5, 0.5).
          setInteractive().
          on('pointerdown', () => {
            let anchor = document.createElement('a')
            anchor.href = './assets/actlab_debrief.pdf'
            anchor.target = '_blank'
            anchor.download = 'actlab_debrief.pdf'
            anchor.click()
          })

        let credit_txt = scene.add.
          text(center, center + 100, 'Click here to get SONA credit.\n(Will take a moment to redirect)', {
            fontFamily: 'Verdana',
            fontStyle: 'bold',
            fontSize: 40,
            color: '#00ff00',
            stroke: '#444444',
            strokeThickness: 4,
            align: 'center'
          }).
          setOrigin(0.5, 0.5).
          setInteractive().
          once('pointerdown', () => {
            credit_txt.text = 'Redirecting now...'
            window.removeEventListener('beforeunload', onBeforeUnload)
            Promise.all(postData(alldata)).then((values) => {
              window.location.href = mostly
            })
          })
      }
    }

    function shrink(scene) {
      scene.tweens.add({
        targets: [mouse, trackball, trackpad, touchscreen],
        scale: { from: 1, to: 0 },
        duration: 500
      })
    }

    const mouse = this.add.image(height * 0.3, height * 0.3, 'mouse').setInteractive().setOrigin(0.5, 0.5)
    mouse.on('pointerdown', () => {
      this.game.user_config.device = 'mouse'
      shrink(this)
      postSelection(this)
    })
    const touchscreen = this.add.image(height * 0.3, height * 0.7, 'touchscreen').setInteractive().setOrigin(0.5, 0.5)
    touchscreen.on('pointerdown', () => {
      this.game.user_config.device = 'touchscreen'
      shrink(this)
      postSelection(this)
    })
    const trackball = this.add.image(height * 0.7, height * 0.3, 'trackball').setInteractive().setOrigin(0.5, 0.5)
    trackball.on('pointerdown', () => {
      this.game.user_config.device = 'trackball'
      shrink(this)
      postSelection(this)
    })
    const trackpad = this.add.image(height * 0.7, height * 0.7, 'trackpad').setInteractive().setOrigin(0.5, 0.5)
    trackpad.on('pointerdown', () => {
      this.game.user_config.device = 'trackpad'
      shrink(this)
      postSelection(this)
    })
  }
}
