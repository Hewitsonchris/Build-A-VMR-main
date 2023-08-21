import Phaser from './phaser-custom'
import TitleScene from './scenes/titleScene'
import MainScene from './scenes/mainScene'
import EndScene from './scenes/endScene'
import UAParser from 'ua-parser-js'

import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js'
import TextTypingPlugin from 'phaser3-rex-plugins/plugins/texttyping-plugin.js'

let small_dim = 1000 // fixed at 1000px so font scaling is constant!
const phaser_config = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  scale: {
    parent: 'phaser-game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: small_dim,
    height: small_dim
  },
  audio: {noAudio: true},
  scene: [TitleScene, MainScene, EndScene],
  plugins: {
    global: [
      {
        key: 'rexBBCodeTextPlugin',
        plugin: BBCodeTextPlugin,
        start: true
      },
      {
        key: 'rexTextTypingPlugin',
        plugin: TextTypingPlugin,
        start: true
      }
    ]
  }
}

window.addEventListener('load', async() => {
  const game = new Phaser.Game(phaser_config)
  // console.log(game.psydapt)
  // TODO: figure out prolific/mturk/elsewhere here (URL parsing)
  // Remember that localStorage *only stores strings*
  const url_params = new URL(window.location.href).searchParams
  // If coming from prolific, use that ID. Otherwise, generate some random chars
  const randomString = (length) =>
    [...Array(length)].
      map(() => (~~(Math.random() * 36)).toString(36)).
      join('')
  let id =
    url_params.get('SONA_ID') ||
    url_params.get('PROLIFIC_PID') ||
    url_params.get('id') ||
    randomString(8)
  let reference_angle = 270
  let ua_res = new UAParser().getResult()
  let user_config = {
    id: id.slice(0, 8), // just the first part of the ID, we don't need to store the whole thing
    is_prolific: url_params.get('PROLIFIC_PID') !== null,
    is_sona: url_params.get('SONA_ID') !== null,
    group: url_params.get('GROUP'),
    institution: 'yale',
    description: 'TARGET ONSET v2',
    datetime: new Date(),
    already_visited: localStorage.getItem('target-onset') !== null,
    width: game.config.width,
    height: game.config.height,
    clamp_size: 4,
    renderer: game.config.renderType === Phaser.CANVAS ? 'canvas' : 'webgl',
    // only take a subset of the UA results-- we don't need everything
    user_agent: {
      browser: ua_res.browser,
      os: ua_res.os
    },
    fullscreen_supported: document.fullscreenEnabled, // this is pretty important for us?
    debug: url_params.get('debug') !== null,
    version: 6,
    reference_angle: reference_angle
  }
  game.user_config = user_config // patch in to pass into game
  // set up for user
  localStorage.setItem('target-onset', 1)
})

// once the data is successfully sent, null this out
// need to log this too
export function onBeforeUnload(event) {
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
  event.preventDefault()
  event.returnValue = ''
  return 'experiment not done yet.'
}
!DEBUG && window.addEventListener('beforeunload', onBeforeUnload)
