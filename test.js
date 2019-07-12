const MarkdownIt = require('markdown-it')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const mkdirp = require('mkdirp')
const glob = require('glob')

const md = new MarkdownIt()
dir = './images'

//创建目录
mkdirp(dir, function(err) {
  if (err) {
    console.log(err)
  }
})

//解析需要遍历的文件夹，我这以E盘根目录为例
var filePath = path.resolve('./docs/zh')

// //调用文件遍历方法
// fileDisplay(filePath);

/**
 * 文件遍历方法
 * @param filePath 需要遍历的文件路径
 */
function fileDisplay(filePath) {
  //根据文件路径读取文件，返回文件列表
  fs.readdir(filePath, function(err, files) {
    if (err) {
      console.warn(err)
    } else {
      //遍历读取到的文件列表
      files.forEach(function(filename) {
        //获取当前文件的绝对路径
        var filedir = path.join(filePath, filename)
        //根据文件路径获取文件信息，返回一个fs.Stats对象
        fs.stat(filedir, function(eror, stats) {
          if (eror) {
            console.warn('获取文件stats失败')
          } else {
            var isFile = stats.isFile() //是文件
            var isDir = stats.isDirectory() //是文件夹
            if (isFile && filedir.endsWith('.md')) {
              console.log(filedir)
            }
            if (isDir) {
              fileDisplay(filedir) //递归，如果是文件夹，就继续遍历该文件夹下面的文件
            }
          }
        })
      })
    }
  })
}

let index = 0
async function downloadImage(url, imgName) {
  const writer = fs.createWriteStream(`./images/${index++}.png`)

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

md.renderer.rules.image = function(tokens, idx) {
  var token = tokens[idx]
  var srcIndex = token.attrIndex('src')
  var url = token.attrs[srcIndex][1]
  downloadImage(url)
  return ''
}

exports.pathResolve = dir => {
  return path.join(__dirname, '..', dir)
}

readFile = file => {
  return new Promise((resolve, reject) => {
    const dirpath = file
    console.log(dirpath)
    fs.readFile(dirpath, 'utf8', (err, data) => {
      if (err) {
        reject()
      }
      resolve(data)
    })
  })
}

async function generate() {
  // const files = ['./docs/guide/README.md', './docs/guide/advanced/cdn.md']
  // var content = []
  // for (const file of files) {
  //   content.push(await readFile(file))
  // }

  // var result = md.render(content.join(','));

  glob(
    '**/*.md',
    {
      cwd: path.resolve(process.cwd(), './docs/zh')
    },
    function(er, files) {
      console.log(files)
      // files is an array of filenames.
      // If the `nonull` option is set, and nothing
      // was found, then files is ["**/*.js"]
      // er is an error object or null.
    }
  )
}

console.log(process.cwd())

generate()

// console.log(result)
