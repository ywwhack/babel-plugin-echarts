const getModulePath = require('./getModulePath')

function buildEcharts (init, path, { types: t }) {
  init.arguments[0].elements.forEach(element => {
    path.insertAfter(
      t.ImportDeclaration(
        [],
        t.StringLiteral(getModulePath(element.value))
      )
    )
  })
  path.replaceWith(t.ImportDeclaration(
    [
      t.ImportDefaultSpecifier(
        path.node.declarations[0].id
      )
    ],
    t.StringLiteral('echarts/lib/echarts')
  ))
}

function buildEchartsAsync (init, path, { types: t, template }) {
  const { elements } = init.arguments[0]
  const requiredModules = elements.map(element => `'${getModulePath(element.value)}'`).join(',')
  const executeModules = elements.map(element => `require('${getModulePath(element.value)}')`).join('\n')
  const node = template(`
    const ${path.node.declarations[0].id.name} = new Promise(resolve => {
      require.ensure([${requiredModules}], require => {
        const _echarts = require('echarts/lib/echarts')
        ${executeModules}
        resolve(_echarts)
      })
    })
  `)()
  path.replaceWith(node)
}

function isEquire (node) {
  if (!node || !node.callee) return false

  const name = node.callee.name
  return name === 'equire' || name === 'equireAsync'
}

module.exports = function (babel) {
  const { types: t } = babel
  return {
    name: 'equire',
    visitor: {
      VariableDeclaration (path) {
        const { node } = path
        // only support one declarations when use this plugin
        const { init } = node.declarations[0]
        if (!isEquire(init)) return

        if (t.isCallExpression(init)) {
          if (init.callee.name === 'equire') {
            buildEcharts(init, path, babel)
          } else if (init.callee.name === 'equireAsync') {
            buildEchartsAsync(init, path, babel)
          }
        }
      }
    }
  }
}