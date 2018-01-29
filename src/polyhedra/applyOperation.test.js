import _ from 'lodash'
import { allSolidNames } from 'data'
import { PRECISION } from 'math/linAlg'
import { getOperations, getRelations } from 'polyhedra/relations'
import Polyhedron from 'math/polyhedron'
import { canAugment } from 'math/operations'
import applyOperation from './applyOperation'

const opsToTest = ['+', '-', 'g', 'P', 'A', '~P', '~A']

function isProperPolyhedron(polyhedron) {
  // Make sure edges all have the same length
  let prevSideLength
  polyhedron.edges.forEach(edge => {
    const [v1, v2] = edge.map(vIndex => polyhedron.vertexVectors()[vIndex])
    const sideLength = v1.distanceTo(v2)
    if (!_.isNil(prevSideLength)) {
      if (Math.abs(sideLength, prevSideLength) > PRECISION) {
        return false
      }
    }
    prevSideLength = sideLength
    // Make sure the whole thing is convex
    if (polyhedron.getDihedralAngle(edge) > Math.PI - PRECISION) {
      return false
    }
  })
  return true
}

expect.extend({
  toBeValidPolyhedron(received) {
    const isProper = isProperPolyhedron(received)
    const matchesName = received.isSame(Polyhedron.get(received.name))
    return {
      message: () => {
        if (!isProper)
          return `expected ${this.isNot
            ? 'an improper'
            : 'a proper'} CRF polyhedron`
        return `expected polyhedron to ${this.isNot
          ? 'not be'
          : 'be'} a ${received.name}`
      },
      pass: isProper && matchesName,
    }
  },
})

function getArgsToTest(operation, polyhedron) {
  switch (operation) {
    case '-':
    case 'g':
      return polyhedron.peaks()
    case '+':
      return polyhedron
        .fIndices()
        .filter(fIndex => canAugment(polyhedron, fIndex))
    default:
      return [null]
  }
}

function getOptsToTest(operation, polyhedron) {
  switch (operation) {
    case '+':
      const relations = getRelations(polyhedron.name, operation)
      const gyrateOpts = _.uniq(_.map(relations, 'gyrate'))
      const usingOpts = _.uniq(_.map(relations, 'using'))
      return _.flatMapDeep(gyrateOpts, gyrate => {
        return usingOpts.map(using => {
          return {
            gyrate: _.uniq(_.compact(gyrateOpts)).length > 1 && gyrate,
            using: _.uniq(_.compact(usingOpts)).length > 1 && using,
          }
        })
      })
    default:
      return [null]
  }
}

describe('applyOperation', () => {
  allSolidNames.forEach(solidName => {
    it(`correctly applies all possible operations on ${solidName}`, () => {
      const operations = _.intersection(getOperations(solidName), opsToTest)
      operations.forEach(operation => {
        const polyhedron = Polyhedron.get(solidName)
        const argsToTest = getArgsToTest(operation, polyhedron)
        const optsToTest = getOptsToTest(operation, polyhedron)

        argsToTest.forEach(args => {
          optsToTest.forEach(options => {
            const result = applyOperation(operation, polyhedron, args, options)
            expect(result).toBeValidPolyhedron()
          })
        })
      })
    })
  })
})
