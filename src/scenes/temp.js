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
      let combo_data = merge_data(current_trial, trial_data)
      console.log("Combo Data: " + combo_data)
      let delay = endpoint_fb_duration
      let fbdelay = 0
      // feedback about movement angle (if non-imagery)
      let first_element = trial_data.movement_data[1]
      let last_element = trial_data.movement_data[trial_data.movement_data.length - 1]
      let target_angle = current_trial.target_angle

      let reach_angles = this.movement_data.filter((a) => a.cursor_extent > 15).map((a) => a.cursor_angle)
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