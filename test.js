const fs = require('fs')
const path = require('path')
const axios = require('axios')
const mkdirp = require('mkdirp')
const glob = require('glob')
const commonMark = require('commonmark')
const Listr = require('listr')
const Table = require('cli-table')
const chalk = require('chalk')

const outputDir = './images'
const inputDir = './docs/zh'

mkdirp(outputDir, function(err) {
  if (err) {
    console.log(err)
  }
})

function downloadImage(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const s = url.split('/')
      const name = s[s.length - 1]
      const writer = fs.createWriteStream(`${outputDir}/${name}`)

      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      })

      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}

const getAllImg = markdown => {
  if (!markdown) return
  const parsed = new commonMark.Parser().parse(markdown)
  const walker = parsed.walker()
  let event
  const nodeList = []
  while ((event = walker.next())) {
    const node = event.node
    if (node.type === 'image' && node.destination) {
      nodeList.push(node)
    }
  }
  const list = nodeList.map(node => node.destination)
  const uniqueSrcList = [...new Set(list)]

  return {
    list,
    uniqueSrcList,
    nodeList
  }
}

const readFile = file => {
  return new Promise((resolve, reject) => {
    const dirPath = file

    fs.readFile(dirPath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }

      const images = getAllImg(data)
      if (images) {
        setTimeout(() => resolve(images.uniqueSrcList), 2000)
      }
    })
  })
}

async function generate() {
  try {
    glob(
      '**/*.md',
      {
        cwd: path.resolve(process.cwd(), inputDir)
      },
      async function(er, files) {
        let success = 0
        const errorArr = []
        const tasksList = files.map(file => {
          return {
            title: file,
            task: () => {
              return new Promise((resolve, reject) => {
                try {
                  const dir = `${inputDir}/${file}`
                  readFile(dir).then(async data => {
                    const promises = []
                    for (const url of data) {
                      promises.push(downloadImage(url))
                    }
                    allSettled(promises).then(results => {
                      results.forEach(result => {
                        const { status } = result
                        if (status === 'fulfilled') {
                          success++
                        } else {
                          errorArr.push({
                            file: dir,
                            url: result.reason.config.url
                          })
                          // console.log(result)
                        }
                      })
                      resolve(file)
                    })
                  })
                } catch (error) {
                  reject(error)
                  throw new Error(error)
                }
              })
            }
          }
        })

        const tasks = new Listr(tasksList, {
          exitOnError: false,
          concurrent: true
          // renderer: "verbose"
        })

        tasks.run().then(() => {
          console.log(chalk.greenBright(`Success download images: ${success}`))
          console.log(
            chalk.redBright(`Error download images: ${errorArr.length}`)
          )

          if (errorArr.length > 0) {
            const table = new Table({
              head: ['File', 'Url']
            })

            errorArr.forEach(e => {
              table.push([e.file || '', e.url || ''])
            })

            console.log(table.toString())
          }
        })
      }
    )
  } catch (error) {
    console.log(error)
  }
}

var allSettled =
  Promise.allSettled ||
  function($) {
    return Promise.all(
      $.map(
        function(value) {
          return Promise.resolve(value)
            .then(this.$)
            .catch(this._)
        },
        {
          $: function(value) {
            return {
              status: 'fulfilled',
              value: value
            }
          },
          _: function(reason) {
            return {
              status: 'rejected',
              reason: reason
            }
          }
        }
      )
    )
  }

generate()
