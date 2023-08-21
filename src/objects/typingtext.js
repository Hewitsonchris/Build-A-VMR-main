var GetValue = Phaser.Utils.Objects.GetValue

export function TypingText(scene, x, y, text, config) {
  var txt = scene.add.rexBBCodeText(x, y, text, config)
  txt.typing = scene.plugins.get('rexTextTypingPlugin').add(txt, GetValue(config, 'type', undefined))

  txt.start = function(text, speed) {
    if (speed !== undefined) {
      this.typing.setTypeSpeed(speed)
    }
    this.typing.start(text)
    return this
  }
  // can connect to text.typing.on('complete', (typing, txt) => {})
  return txt
}
