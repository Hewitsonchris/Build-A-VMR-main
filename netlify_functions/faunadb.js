// from https://github.com/netlify/netlify-faunadb-example/blob/master/functions/todos-create.js
const faunadb = require('faunadb')
const q = faunadb.query

exports.handler = async(event) => {
  // create client w/ secret
  const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET_V2,
    domain: 'db.us.fauna.com',
    scheme: 'https'
  })
  const data_in = JSON.parse(event.body)
  return client.
    query(
      q.Create(q.Collection('data'), {data: data_in})
    ).
    then((response) => {
      console.log('success', response)
      /* Success! return the response with statusCode 200 */
      return {
        statusCode: 200,
        body: JSON.stringify(response)
      }
    }).
    catch((error) => {
      console.log('error', error)
      /* Error! return the error with statusCode 400 */
      return {
        statusCode: 400,
        body: JSON.stringify(error)
      }
    })
}
