const fs = require('fs')
const path = require('path')
const axios = require('axios')
const mkdirp = require('mkdirp')
const glob = require('glob')
const commonMark = require('commonmark')

const outputDir = './images'
const inputDir = './docs/zh'

mkdirp(outputDir, function(err) {
  if (err) {
    console.log(err)
  }
})

async function downloadImage(url) {
  const s = url.split('/')
  const name = s[s.length - 1]
  const writer = fs.createWriteStream(`${outputDir}/${name}`)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
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
        resolve(images.uniqueSrcList)
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
        let imgs = []
        for (const file of files) {
          const data = await readFile(`${inputDir}/${file}`)
          imgs = imgs.concat(data)
        }

        imgs = [...new Set(imgs)]

        for (const url of imgs) {
          downloadImage(url)
        }
      }
    )
  } catch (error) {
    console.log(error)
  }
}

generate()
