import { TypingText } from '../objects/typingtext'
import { Enum } from '../utils/enum'
import BasicExample from '../objects/examples'
import merge_data from '../utils/merge'
import { clamp } from '../utils/clamp'
import signedAngleDeg from '../utils/angulardist'
import { mad, median } from '../utils/medians'
import generateTrials from '../utils/trialgen'

const WHITE = 0xffffff
const GREEN = 0x09ce0e // actually move to the target
const MAGENTA = 0xf666bd
const RED = 0xff0000
const GRAY = 0x666666
const DARKGRAY = 0x444444
const LIGHTBLUE = 0xa6d9ea
let TARGET_SIZE_RADIUS = 15 // no longer a constant
const CURSOR_SIZE_RADIUS = 8
const CENTER_SIZE_RADIUS = 12
const MOVE_THRESHOLD = 4
const TARGET_DISTANCE = 378 // 10cm with normal 96 dpi
const CURSOR_RESTORE_POINT = 30 //
const MOVE_SCALE = 1 // factor to combat pointer acceleration
const PI = Math.PI
const MAX_RT = 1000
const MAX_MT = 300
const hold_duration = 500
const midpoint_fb_duration = 100
const endpoint_fb_duration = 500
const n_dots = 50

// fill txts later-- we need to plug in instructions based on their runtime mouse choice
let instruct_txts = {}

const states = Enum([
  'INSTRUCT', // show text instructions (based on stage of task)
  'AIM',
  'PRETRIAL', // wait until in center
  'MOVING', // shoot through / mask + animation (if probe)
  'POSTTRIAL', // auto teleport back to restore point
  'END' //
])

const Err = {
    reached_away: 1,
    late_start: 2,
    slow_reach: 4,
    wiggly_reach: 8,
    returned_to_center: 16,
    early_start: 32
}
const FB_types = {
    mp: 1,
    ep: 2,
    online: 4
}

function countTrials(array) {
  return array.filter((v) => !v['trial_type'].startsWith('instruct_')).length
}

function gaussianNoise(sd) { //zero mean gaussian noise
    var z = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())
    return sd*z
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
    this._state = states.INSTRUCT
    this.entering = true
    // these line up with trial_type
    this.all_data = {
      practice_basic: [], // practice reaching with vis feedback
      practice_aim: [],
      clamp: [],
      rot: [],
      wash: [] 
    }
  }

  create() {
    let config = this.game.config
    let user_config = this.game.user_config
    // let hand = user_config.hand // 'right' or 'left'
    // camera (origin is center)
    this.cameras.main.setBounds(-config.width / 2, -config.height/2, config.width, config.height)
    let height = config.height
    let hd2 = height / 2
    this.trial_counter = 0
    this.entering = true
    this.state = states.INSTRUCT
    // used for imagery component
    this.rts = []
    this.movets = []
    this.is_debug = user_config.debug

    // set number of repeats
    if (this.is_debug) {
      this.trials = generateTrials(4, user_config.clamp_size)
      this.typing_speed = 1
    } else {
        this.trials = generateTrials(80, user_config.clamp_size)
      this.typing_speed = 1
      }

      //now set the target angle
      let radians = Phaser.Math.DegToRad(270)
      let x = TARGET_DISTANCE * Math.cos(radians)
      let y = TARGET_DISTANCE * Math.sin(radians)
      this.target = this.add.circle(x, y, TARGET_SIZE_RADIUS, GRAY) //will be changed!
      this.target.visible = false

    // user cursor
    this.user_cursor = this.add.circle(CURSOR_RESTORE_POINT, CURSOR_RESTORE_POINT, CURSOR_SIZE_RADIUS, LIGHTBLUE) // controlled by user (gray to reduce contrast)
    this.fake_cursor = this.add.circle(0, 0, CURSOR_SIZE_RADIUS, LIGHTBLUE).setVisible(false) // animated by program
    this.dbg_cursor = this.add.circle(0, 0, CURSOR_SIZE_RADIUS, RED, 1).setVisible(false && this.is_debug) // "true" cursor pos without clamp/rot, only in debug mode

    // center
    this.center = this.add.circle(0, 0, CENTER_SIZE_RADIUS, WHITE)
    this.origin = new Phaser.Geom.Circle(0, 0, CENTER_SIZE_RADIUS)

      //endpoint cursor
      this.endpoint_cursor = this.add.circle(0, 0, CURSOR_SIZE_RADIUS, LIGHTBLUE)
      this.endpoint_cursor.visible = false

      //midpoint cursor
      this.midpoint_cursor = this.add.circle(0, 0, CURSOR_SIZE_RADIUS, LIGHTBLUE)
      this.midpoint_cursor.visible = false
      this.midpoint_raw_angle = 0
      this.midpoint_cursor_angle = 0
      this.endpoint_angle = 0
      this.endpoint_raw_angle = 0

      //texture renderer for cursor cloud
      this.rt = this.add.renderTexture(0, 0, 500, 500).setOrigin(0.5, 0.5) //limit texture size
      this.rt.camera.setBounds(-250, -250, 500, 500)

      //aim
      this.aim_angle = 0
      this.aim_line = this.add.line(0, 0, 0, 0, 0, 0.8 * TARGET_DISTANCE, 0xffffff).setOrigin(0.5, 0.5).setVisible(false) //aim line, centered at half the targ distance
      this.aim_reticle = this.add.text(0, TARGET_DISTANCE, 'X', {
          fontFamily: 'Verdana',
          fontSize: 50,
          align: 'center'
      }).setOrigin(0.5, 0.5).setVisible(false)
      this.aim_txt = this.add.text(0, hd2 - 100, 'Click the mouse button to set aim.', {
              fontFamily: 'Verdana',
              fontSize: 50,
              align: 'center'
          }).
          setOrigin(0.5, 0.5).
          setVisible(false)
      this.aim_line.y = 0.5 * TARGET_DISTANCE
  
    // big fullscreen quad in front of game, but behind text instructions
    this.darkener = this.add.rectangle(0, 0, height, height, 0x000000).setAlpha(1)


    // other warnings
    this.other_warns = this.add.
      rexBBCodeText(0, 0, '', {
        fontFamily: 'Verdana',
        fontStyle: 'bold',
        fontSize: 50,
        color: '#ffffff',
        align: 'center',
        stroke: '#444444',
        backgroundColor: '#000000',
        strokeThickness: 4
      }).
      setOrigin(0.5, 0.5).
      setVisible(false)

    this.instructions = TypingText(this, /* half width */-400, -hd2 + 50, '', {
      fontFamily: 'Verdana',
      fontSize: 20,
      wrap: {
        mode: 'word',
        width: 800
      }
    }).setVisible(false)

    this.start_txt = this.add.
      text(0, hd2 - 100, 'Click the mouse button to continue.', {
        fontFamily: 'Verdana',
        fontSize: 50,
        align: 'center'
      }).
      setOrigin(0.5, 0.5).
      setVisible(false)

    this.debug_txt = this.add.text(-hd2, -hd2, '')
    this.progress = this.add.text(hd2, -hd2, '').setOrigin(1, 0)
    this.tmp_counter = 1
    this.total_len = countTrials(this.trials)
    // examples
    this.examples = { //come back to this; need to set up prep times in exmples
      // go + feedback
      basic: new BasicExample(this, 0, 200, true, false).setVisible(false),
      clamp: new BasicExample(this, 0, 200, true, true).setVisible(false)
    }


    // start the mouse at offset
    this.raw_x = CURSOR_RESTORE_POINT
    this.raw_y = CURSOR_RESTORE_POINT
      this.next_trial()


    // set up mouse callback (does all the heavy lifting)
    this.input.on('pointerdown', () => {
      if (this.state !== states.END) {
        !DEBUG && this.scale.startFullscreen()
        this.time.delayedCall(300, () => {
          this.input.mouse.requestPointerLock()
        })
      }
    })
    this.input.on('pointerlockchange', () => {
      console.log('oh no, this does not work')
    })

    this.ptr_cb = (ptr) => {
      if (this.input.mouse.locked) {
        let is_coalesced = 'getCoalescedEvents' in ptr
        // feature detect firefox (& ignore, see https://bugzilla.mozilla.org/show_bug.cgi?id=1753724)
        // TODO: detect first input & use as reference position for FF
        let not_ff = 'altitudeAngle' in ptr
        // AFAIK, Safari and IE don't support coalesced events
        // See https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
        let evts = is_coalesced && not_ff ? ptr.getCoalescedEvents() : [ptr]
        // console.log(evts.length)
        // the timestamps of ptr and the last event should match, and the
        // sum of all movements in evts should match ptr
        // console.log(ptr)
        // console.log(evts[evts.length - 1])
        for (let evt of evts) {
          // scale movement by const factor
          let dx = evt.movementX * MOVE_SCALE
          let dy = evt.movementY * MOVE_SCALE
          // console.log(`t: ${evt.timeStamp}, dxdy: (${dx}, ${dy})`)
          // update "raw" mouse position (remember to set these back to (0, 0)
          // when starting a new trial)
          this.raw_x += dx
          this.raw_y += dy
          this.raw_x = clamp(this.raw_x, -hd2, hd2)
          this.raw_y = clamp(this.raw_y, -hd2, hd2)

          // useful for deciding when to turn on/off visual feedback
          let extent = Math.sqrt(Math.pow(this.raw_x, 2) + Math.pow(this.raw_y, 2))
          // convert cursor angle to degrees
          let cursor_angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Normalize(Math.atan2(this.raw_y, this.raw_x)))
          let curs_x = this.raw_x
          let curs_y = this.raw_y
          this.dbg_cursor.setPosition(curs_x, curs_y)

          this.cursor_angle = cursor_angle
          this.user_cursor.x = curs_x
          this.user_cursor.y = curs_y
            this.extent = extent

            // set up the manipulated cursor
            if(this.current_trial.rot_or_clamp == 'clamp')
                this.rad = Phaser.Math.DegToRad(this.current_trial.manip_angle + this.current_trial.target_angle)
            else if(this.current_trial.rot_or_clamp == 'rot')
                this.rad = Phaser.Math.DegToRad(this.current_trial.manip_angle + this.cursor_angle)
            else
                this.rad = Phaser.Math.DegToRad(this.cursor_angle)
            this.fake_cursor.x = extent * Math.cos(this.rad)
            this.fake_cursor.y = extent * Math.sin(this.rad)
            


            if (this.state === states.MOVING) {
                if (this.current_trial.fb & FB_types.online) {
                    this.rt.x = this.fake_cursor.x
                    this.rt.y = this.fake_cursor.y
                }
                if (extent >= 0.5 * TARGET_DISTANCE && this.midpoint_cursor.x == 0 && this.midpoint_cursor.y == 0) { // we haven't set it yet
                    this.midpoint_cursor.x = this.fake_cursor.x
                    this.midpoint_cursor.y = this.fake_cursor.y
                    this.midpoint_raw_angle = this.cursor_angle
                    this.midpoint_cursor_angle = Phaser.Math.RadToDeg(this.rad)
                    if (this.current_trial.fb & FB_types.mp) { //trial has midpoint fb
                        if (this.current_trial.cursor_cloud_sd > 0) {
                            this.rt.x = this.midpoint_cursor.x
                            this.rt.y = this.midpoint_cursor.y
                            this.rt.draw(this.cloud)
                        } else {
                            this.midpoint_cursor.visible = true
                        }
                        this.mp_fb_done = false
                        this.time.delayedCall(midpoint_fb_duration, () => {
                            this.midpoint_cursor.visible = false //hide after fixed amt of time
                            this.rt.clear()
                            this.mp_fb_done = true //tell trial to progress
                        })
                    }
                } else {
                    this.mp_fb_done = true //don't hold up trial if non-existent midpoint fb; also if trial aborts (for some reason)
                }
            this.movement_data.push({
              evt_time: evt.timeStamp,
              raw_x: this.raw_x,
              raw_y: this.raw_y,
              cursor_x: this.fake_cursor.x,
              cursor_y: this.fake_cursor.y,
              cursor_extent: extent,
              cursor_angle: Phaser.Math.RadToDeg(this.rad),
              hand_angle: Phaser.Math.DegToRad(this.cursor_angle)
            })
            }
            if (this.state === states.AIM) {
                this.aim_reticle.x = TARGET_DISTANCE * Math.cos(Phaser.Math.DegToRad(this.cursor_angle))
                this.aim_reticle.y = TARGET_DISTANCE * Math.sin(Phaser.Math.DegToRad(this.cursor_angle))
                this.aim_reticle.angle = this.cursor_angle-90
                this.aim_line.x = this.aim_reticle.x * 0.5
                this.aim_line.y = this.aim_reticle.y * 0.5
                this.aim_line.angle = this.cursor_angle - 90
            }
            if (this.state === states.POSTTRIAL) {
                this.endpoint_cursor.x = TARGET_DISTANCE * Math.cos(Phaser.Math.DegToRad(this.endpoint_angle))
                this.endpoint_cursor.y = TARGET_DISTANCE * Math.sin(Phaser.Math.DegToRad(this.endpoint_angle))
            }
        }
      }
    }

    document.addEventListener('pointermove', this.ptr_cb, {passive: true, capture: true})
    // initial instructions (move straight through target)
    instruct_txts['instruct_basic'] =
        `You will control a cursor with your mouse, and try to bring it to the target. Hold that cursor in the circle at the center of the screen to start a trial.\n
        A target will show up on the screen and you should try to [color=#ffff00]quickly move straight through the target[/color]. Try to hit the very center of the target! \n
        [color=#ffff00]Always quickly shoot your mouse straight through the target.[/color] \n

        See the example below. We show the system cursor to illustrate the mouse position, but it will never be visible when you are doing the task.`

      instruct_txts['instruct_aim'] =
          `Great work! Now, before each trial, we may ask you to indicate where you intend to move. Use your mouse to control the reticle and place the X where you intend to move your hand. \n
            Once you've set where your intended aim, right click to proceed to the trial. Remember to move toward where you aimed!`

    instruct_txts['instruct_clamp'] =
          `Excellent job! In this section, the cursor will now be broken. It will move in a straight line toward the target, but it will always land slightly off of the center.\n
            [color=#ffff00]You will see the cursor follow this path no matter where you actually move your mouse. You can ignore the cursor and keep moving as you were before.[/color] \n
            Ignore the cursor and try to move your mouse straight to the very center of the target. The cursor will never seem to hit the target, but that is because it is broken. \n
            The cursor will always be offset but you can ignore that and keep reaching straight towards the target.\n
            Remember to make fast, straight movements toward the center of the target. Always try to hit the center of the target!`

      instruct_txts['instruct_rot'] =
          `Excellent job! In this section, the cursor will now be broken. It will move a slightly different direction from where you move your hand.\n
            [color=#ffff00]You should try to adjust your movement to make the cursor hit the target. Specifically, you should find a spot to aim where the cursor goes straight to the target.[/color] \n
            Ignore the cursor and try to move your mouse straight to the very center of the target. The cursor will never seem to hit the target, but that is because it is broken. \n
            The cursor will always be offset but you can ignore that and keep reaching straight towards the target.\n
            Remember to make fast, straight movements toward the center of the target. Always try to hit the center of the target!`

      instruct_txts['instruct_wash'] =
        `Good work! In this section you will not see the cursor at all. Instead, always go straight to the target, even though you will not see the cursor. \n
            You're doing great! This is the last section.`
      } // end create

  update() {
      let current_trial = this.current_trial
    switch (this.state) {
    case states.INSTRUCT:
      if (this.entering) {
        this.entering = false
        let tt = current_trial.trial_type

        // show the right instruction text, wait until typing complete
        // and response made
        this.instructions.visible = true
        this.darkener.visible = true
        this.instructions.start(instruct_txts[tt], this.typing_speed)
        if (tt === 'instruct_basic' || tt==='instruct_wash') {
          this.examples.basic.visible = true
          this.examples.basic.play()
        } else if (tt === 'instruct_clamp' || tt=== 'instruct_rot' || tt === 'break') { //break isn't given but I may revisit this
          this.examples.clamp.visible = true
          this.examples.clamp.play()
        }
          //TODO: make a demo for AIMING
        this.instructions.typing.once('complete', () => {
          this.start_txt.visible = true
          this.input.once('pointerdown', () => {
            this.examples.basic.stop()
            this.examples.basic.visible = false
            this.examples.clamp.stop()
            this.examples.clamp.visible = false
            this.next_trial()
            this.darkener.visible = false
            this.instructions.visible = false
            this.instructions.text = ''
            this.start_txt.visible = false
          })
        })
      }
      break
        case states.AIM:
            if (this.entering) {
                this.entering = false
                this.user_cursor.visible = false
                this.fake_cursor.visible = false
                this.aim_line.visible = true
                this.aim_reticle.visible = true
                this.aim_txt.visible = true
                var rad = Phaser.Math.DegToRad(this.current_trial.target_angle)
                this.target.x = TARGET_DISTANCE * Math.cos(rad)
                this.target.y = TARGET_DISTANCE * Math.sin(rad)
                this.target.fillColor = GREEN
                this.target.visible = true
                this.input.once('pointerdown', () => {
                    this.aim_line.visible = false
                    this.aim_reticle.visible = false
                    this.aim_txt.visible = true
                    this.aim_angle = this.cursor_angle
                    console.log("Aim Angle: " + this.aim_angle)
                    this.state = states.PRETRIAL
                })
            }
      break

    case states.PRETRIAL:
      if (this.entering) {
          this.origin.visible = true
          this.center.visible = true
        this.entering = false
        this.target.visible = false
        this.hold_val = hold_duration
        this.hold_t = this.hold_val
        this.user_cursor.visible = true
        this.t_ref = window.performance.now()

        //set up the cursor cloud at this point
          if (this.current_trial.cursor_cloud_sd > 0) {
              var cloud_sd_px = this.current_trial.cursor_cloud_sd * 96 / 2.54 //cm to px
              var xs = Array.apply(null, Array(n_dots)).map(function () { return gaussianNoise(cloud_sd_px) }) 
              var ys = Array.apply(null, Array(n_dots)).map(function () { return gaussianNoise(cloud_sd_px) }) 

              var meanx = xs.reduce((tot, cur) => {
                  return tot + cur
              }) / n_dots
              xs = xs.map((v) => {
                  return v - meanx
              })
              var meany = ys.reduce((tot, cur) => {
                  return tot + cur
              }) / n_dots
              ys = ys.map((v) => {
                  return v - meany
              })
              var dots = []
              for (var i = 0; i < n_dots; i++) {
                  dots[i] = this.add.circle(xs[i], ys[i], CURSOR_SIZE_RADIUS, LIGHTBLUE)
              }
              this.cloud = this.add.container(0, 0).setVisible(false)
              this.cloud.add(dots)
          }
      }
      if (Phaser.Geom.Circle.ContainsPoint(this.origin, this.user_cursor)) {
        this.hold_t -= this.game.loop.delta
        if (this.hold_t <= 0) {
          this.inter_trial_interval = window.performance.now() - this.t_ref
          this.raw_x = 0
          this.raw_y = 0
          this.extent = 0
          this.user_cursor.x = 0
          this.user_cursor.y = 0
          this.user_cursor.visible = false //hide cursor
          this.state = states.MOVING
          this.movement_data = []
        }
      } else {
        this.hold_t = this.hold_val
      }
      break
        case states.MOVING:
            // for non-probe trials, they control the cursor
            // for probe trials, there's a fixed cursor animation
            // that runs completely, regardless of what they do with the cursor
            // only thing they control on probe is initiation time
            if (this.entering) {
                this.entering = false
                this.rt.clear()
                if(this.current_trial.fb & FB_types.online)
                    this.rt.draw(this.cloud)
                this.reference_time = this.game.loop.now
                this.last_frame_time = this.game.loop.now
                this.dropped_frame_count = 0
                this.dts = []
                // every trial starts at 0, 0
                this.movement_data.splice(0, 0, {
                    evt_time: this.reference_time,
                    raw_x: 0,
                    raw_y: 0,
                    cursor_x: 0,
                    cursor_y: 0,
                    cursor_extent: 0,
                    cursor_angle: 0
                })
                //hide center
                this.center.visible = false
                //show target
                var rad = Phaser.Math.DegToRad(this.current_trial.target_angle)
                this.target.x = TARGET_DISTANCE * Math.cos(rad)
                this.target.y = TARGET_DISTANCE * Math.sin(rad)
                this.target.fillColor = GREEN
                this.target.visible = true
                this.fake_cursor.visible = (current_trial.fb & FB_types.online)> 0 && current_trial.cursor_cloud_sd==0

            } else { // second iter ++
                let est_dt = 1 / this.game.user_config.refresh_rate_est * 1000
                let this_dt = this.game.loop.now - this.last_frame_time
                this.dropped_frame_count += this_dt > 1.5 * est_dt
                this.dts.push(this_dt)
                this.last_frame_time = this.game.loop.now
            }
            let real_extent = Math.sqrt(Math.pow(this.user_cursor.x, 2) + Math.pow(this.user_cursor.y, 2))

            if (real_extent >= 0.98 * TARGET_DISTANCE) {
                this.state = states.POSTTRIAL
                this.user_cursor.visible = false //compute endpoint feedback
                this.fake_cursor.visible = false
                this.rt.clear()
                this.endpoint_angle = Phaser.Math.RadToDeg(this.rad) //endpoint angle freezes
                this.endpoint_raw_angle = this.cursor_angle
            }
            break;

    case states.POSTTRIAL:
      if (this.entering) {
        this.entering = false
        // deal with trial data
        let trial_data = {
          movement_data: this.movement_data,
          ref_time: this.reference_time,
          trial_number: this.trial_counter++,
          target_size_radius: TARGET_SIZE_RADIUS, // varies
          cursor_size_radius: CURSOR_SIZE_RADIUS,
          iti: this.inter_trial_interval, // amount of time between cursor appear & teleport
          hold_time: this.hold_val,
          dropped_frame_count: this.dropped_frame_count
        }
        console.log("MOVEMENT DATA" + extent, cursor_angle)

        let combo_data = merge_data(current_trial, trial_data)
        console.log("Combo Data: " + combo_data)
        let delay = endpoint_fb_duration
        let fbdelay = 0
        // feedback about movement angle (if non-imagery)
        let first_element = trial_data.movement_data[1]
        let last_element = trial_data.movement_data[trial_data.movement_data.length - 1]
        let target_angle = current_trial.target_angle

        let reach_angles = this.movement_data.filter((a) => a.cursor_extent > 15).map((a) => a.cursor_angle)
        console.log("REACH ANGLES" + reach_angles)
        let end_angle = reach_angles.slice(-1)
        let norm_reach_angles = reach_angles.map((a) => signedAngleDeg(a, end_angle))
        let reaction_time = null
        let reach_time = null
        console.log("ERROR!!:" + (Math.abs(signedAngleDeg(last_element.cursor_angle, target_angle))))
        if (last_element && trial_data.movement_data.length > 2) {
            var start_left_idx = trial_data.movement_data.findIndex(function (e) {
                return e.cursor_extent>=15
            })
          reaction_time = trial_data.movement_data[start_left_idx].evt_time - this.reference_time
          reach_time = last_element.evt_time - trial_data.movement_data[start_left_idx].evt_time
          }
          console.log(reaction_time)
        if (!(reaction_time === null)) {
          this.rts.push(reaction_time)
          this.movets.push(reach_time)
        }
        let punished = false
        let punish_delay = 1000
        let punish_flags = 0
        if (Math.abs(signedAngleDeg(last_element.cursor_angle, target_angle)) >= 60) {
          punish_flags |= Err.reached_away
          if (!punished) {
            punished = true
            this.other_warns.text = '[b]Please try to hit the target.[/b]'
          }
        }
          if (reaction_time >= MAX_RT) {
          punish_flags |= Err.late_start
          if (!punished) {
              punished = true
              this.other_warns.text = '[b]Please start the\nreach sooner.[/b]'
          }
        }

        if (reach_time >= MAX_MT) {
          // slow reach
          punish_flags |= Err.slow_reach
          if (!punished) {
            punished = true
            this.other_warns.text = '[b]Please move quickly\n through the target.[/b]'
          }
        }
        if (mad(norm_reach_angles) > 10) {
          // wiggly reach
          punish_flags |= Err.wiggly_reach
          if (!punished) {
              punished = true
            this.other_warns.text = '[b]Please make [color=yellow]straight[/color]\nreaches toward the target.[/b]'
          }
        }
        if (punished) {
          delay += punish_delay
            this.other_warns.visible = true

            this.target.visible = false
          this.time.delayedCall(punish_delay, () => {
            this.other_warns.visible = false
          })
        } else {
            //display the endpoint cursor
            if (this.current_trial.cursor_cloud_sd > 0 && (this.current_trial.fb & FB_types.ep) >0) {
                this.rt.x = this.endpoint_cursor.x
                this.rt.y = this.endpoint_cursor.y
                this.rt.draw(this.cloud)
            } else {
                this.endpoint_cursor.visible = this.current_trial.fb & FB_types.ep
            }
        }
        combo_data['reaction_time'] = reaction_time
        combo_data['reach_time'] = reach_time
        combo_data['aim_angle'] = this.aim_angle
        combo_data['midpoint_raw_angle'] = this.midpoint_raw_angle
        combo_data['midpoint_cursor_angle'] = this.midpoint_cursor_angle
        combo_data['endpoint_raw_angle'] = this.endpoint_raw_angle
        combo_data['endpoint_cursor_angle'] = this.endpoint_angle

        this.time.delayedCall(fbdelay, () => {
          this.time.delayedCall(delay, () => {
            combo_data['any_punishment'] = punished
            combo_data['punish_types'] = punish_flags
            this.all_data[current_trial.trial_type].push(combo_data)
            this.tmp_counter++
            this.raw_x = this.raw_y = this.user_cursor.x = this.user_cursor.y = CURSOR_RESTORE_POINT
            this.user_cursor.visible = true
            this.fake_cursor.visible = false
            this.target.visible = false
            this.endpoint_cursor.visible = false
            this.rt.clear()
            this.midpoint_cursor.x = 0
            this.midpoint_cursor.y = 0 //reset cursor to allow us to flag mp on next trial
            this.rt.x = 0
            this.rt.y = 0
            this.tweens.add({
              targets: this.user_cursor,
              scale: { from: 0, to: 1 },
              ease: 'Elastic',
              easeParams: [5, 0.5],
              duration: 800,
                onComplete: () => {
                    this.next_trial()
              }
            })
          })
        })
      }
      break
    case states.END:
      if (this.entering) {
        this.entering = false
        this.input.mouse.releasePointerLock()
        document.removeEventListener('pointermove', this.ptr_cb, {passive: true, capture: true})
        // fade out
        this.tweens.addCounter({
          from: 255,
          to: 0,
          duration: 2000,
          onUpdate: (t) => {
            let v = Math.floor(t.getValue())
            this.cameras.main.setAlpha(v / 255)
          },
          onComplete: () => {
            // this.scene.start('QuestionScene', { question_number: 1, data: this.all_data })
            this.scene.start('EndScene', this.all_data)
          }
        })
      }
      break
    }
  } // end update

  get state() {
    return this._state
  }

  set state(newState) {
    this.entering = true
    this._state = newState
  }

  next_trial() {
    // move to the next trial, and set the state depending on trial_type
    if (this.tmp_counter > this.total_len) {
      this.progress.visible = false
    } else {
      this.progress.text = `${this.tmp_counter} / ${this.total_len}`
    }
    this.current_trial = this.trials.shift()
    let cur_trial = this.current_trial
    let tt = ''
    if (cur_trial !== undefined) {
      tt = cur_trial.trial_type
    }
    if (cur_trial === undefined || this.trials.length < 1 && tt.startsWith('break')) {
      this.state = states.END
    } else if (tt.startsWith('instruct_') || tt.startsWith('break')) {
      this.state = states.INSTRUCT
    } else if (
      tt.startsWith('practice') ||
        tt.startsWith('clamp') || tt.startsWith('rot') ||
        tt.startsWith('wash')
    ) {
        if (this.current_trial.aim) {
            this.state = states.AIM
            this.target.visible = true
        } else {
            this.state = states.PRETRIAL
            this.center.fillColor = WHITE
            this.target.visible = false
        }
    } else {
      // undefine
      console.error('Oh no, wrong next_trial.')
    }
  }
}
