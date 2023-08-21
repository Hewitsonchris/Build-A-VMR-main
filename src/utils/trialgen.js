/*
NB target distance is a constant in main
center sizes are consts in main


*/

/*
repeats (default 80) is number of repeats per clamp type
*/

export default function generateTrials(repeats = 80, CLAMP_ANGLE = 4) {

    //const FB_types = {
    //    mp: 1,
    //    ep: 2,
    //    online: 4
    //}
    // fb is bitshifted-- so, say you want online feedback + endpoint => 110 = 6

    let reps = 10
    let targ_loc = 315
    let out = []
    out.push({ trial_type: 'instruct_basic' }) // first page
    for (let i = 0; i < reps; i++) {
        out.push({
            trial_type: 'practice_basic',
            aim: false, //does this trial have aim?
            rot_or_clamp: false, //'rot' 'clamp' or false (i.e. veridical fb)
            manip_angle: 0, //manipulation angle
            fb: 6, //see FB_types for key
            target_angle: targ_loc,
            cursor_cloud_sd: 0.5 //uncertainty condition
        })
    }
    out.push({ trial_type: 'instruct_aim' }) //aim instructions
    for (let i = 0; i < reps; i++) {
        out.push({
            trial_type: 'practice_aim',
            aim: true, //does this trial have aim?
            rot_or_clamp: false, //'rot' 'clamp' or false (i.e. veridical fb)
            manip_angle: 0, //manipulation angle
            fb: i%4 + 1, //see FB_types for key
            target_angle: targ_loc,
            cursor_cloud_sd: 0.5
        })
    }
    out.push({ trial_type: 'instruct_clamp' }) //aim instructions
    for (let i = 0; i < reps; i++) {
        out.push({
            trial_type: 'clamp',
            aim: false, //does this trial have aim?
            rot_or_clamp: 'clamp', //'rot' 'clamp' or false (i.e. veridical fb)
            manip_angle: 45, //manipulation angle
            fb: 6, //see FB_types for key
            target_angle: targ_loc,
            cursor_cloud_sd: 0.5
        })
    }
    out.push({ trial_type: 'instruct_rot' }) //aim instructions
    for (let i = 0; i < reps; i++) {
        out.push({
            trial_type: 'rot',
            aim: false, //does this trial have aim?
            rot_or_clamp: 'rot', //'rot' 'clamp' or false (i.e. veridical fb)
            manip_angle:45, //manipulation angle
            fb: 6, //see FB_types for key
            target_angle: targ_loc,
            cursor_cloud_sd: 0.5
        })
    }
    out.push({ trial_type: 'instruct_wash' }) //clamp instructions (also disappearing target)
    for (let i = 0; i < reps; i++) {
        out.push({
            trial_type: 'wash',
            aim: false, //does this trial have aim?
            rot_or_clamp: false, //'rot' 'clamp' or false (i.e. veridical fb)
            manip_angle: 0, //manipulation angle
            fb: 0, //see FB_types for key
            target_angle: targ_loc,
            cursor_cloud_sd: 0
        })
    }
    return out
}
