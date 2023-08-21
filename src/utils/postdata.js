
function _postData(data, url) {
  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(data, (k, v) => {
      // reduce number of decimal points for floating point numbers
      return v && v.toFixed ? Number(v.toFixed(3)) : v
    })
  }).
    then(function(response) {
      if (response.status !== 200) {
        console.log('There was an issue: ' + response.status)
      } else {
        console.log('No issues ;)')
      }
      return response
    }).
    catch(function(err) {
      console.log('Fetch err: ', err)
      return 500
    })
}

function postMailgun(data) {
  return _postData(data, '/.netlify/functions/mailgun')
}

function postFauna(data) {
  return _postData(data, '/.netlify/functions/faunadb')
}

export default function postData(data) {
  return [postMailgun(data), postFauna(data)]
}
