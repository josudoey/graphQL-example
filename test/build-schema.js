/* eslint-env node, mocha */
const {
  graphql,
  buildSchema
} = require('graphql')
const assert = require('assert')

const schema = buildSchema(`
  input MessageInput {
    content: String
    author: String
  }

  type Message {
    id: ID!
    content: String
    author: String
  }

  type Query {
    queryMessage(skip: Int): [Message]
    getMessage(id: String!): Message
  }

  type Mutation {
    createMessage(input: MessageInput): Message
    updateMessage(id: ID!, input: MessageInput): Message
  }
`)
class Message {
  constructor (id, { content, author }) {
    this.id = id
    this.content = content
    this.author = author
  }
}

const fakeDatabase = {
  one: {
    author: 'joey',
    content: 'hello world'
  }
}

const root = {
  getMessage: function ({ id }) {
    if (!fakeDatabase[id]) {
      throw new Error('no message exists with id ' + id)
    }
    return new Message(id, fakeDatabase[id])
  },
  createMessage: function ({ input }) {
    // Create a random id for our "database".
    var id = require('crypto').randomBytes(10).toString('hex')

    fakeDatabase[id] = input
    return new Message(id, input)
  },
  updateMessage: function ({ id, input }) {
    if (!fakeDatabase[id]) {
      throw new Error('no message exists with id ' + id)
    }
    // This replaces all old data, but some apps might want partial update.
    fakeDatabase[id] = input
    return new Message(id, input)
  }
}

describe('build-schema', function () {
  it('createMessage', async () => {
    const result = await graphql(schema, `
mutation($input: MessageInput) {
  createMessage(input: $input) {
    id
    author
    content
  }
}`, root, {}, {
      input: {
        author: 'joey',
        content: 'world is good'
      }
    })

    const data = result.data
    assert(data.createMessage.id)
    assert.strictEqual(data.createMessage.author, 'joey')
    assert.strictEqual(data.createMessage.content, 'world is good')
  })

  it('getMessage', async () => {
    const result = await graphql(schema, `
query($id:String!){ 
# query message id 
  getMessage(id:$id) {
    author
    content
  }
}`, root, {}, {
      id: 'one'
    })

    const data = result.data
    assert.deepStrictEqual(JSON.parse(JSON.stringify(data)), {
      getMessage: {
        author: 'joey',
        content: 'hello world'
      }
    })
  })
})
