// @flow strict
import * as React from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';
import _ from 'lodash';

import { getJohnsonSymmetry } from 'data';
import { polygonNames } from 'constants/polygons';
import { fonts } from 'styles';
import {
  unescapeName,
  getType,
  toConwayNotation,
  getAlternateNames,
} from 'polyhedra/names';

import connect from 'components/connect';
import { WithPolyhedron } from 'components/Viewer/context';

const styles = StyleSheet.create({
  table: {
    width: 400, // FIXME don't hardcode
    margin: 10,
    borderSpacing: 8,
    borderCollapse: 'separate',
    padding: 10,
    // fontFamily: fonts.hoeflerText,
  },

  solidName: {
    fontSize: 22,
    marginBottom: 10,
  },

  solidType: {
    fontSize: 18,
    color: 'DimGrey',
    marginBottom: 20,
  },

  dataList: {
    display: 'grid',
    gridTemplateAreas: `
      "verts verts edges edges faces faces"
      "vconf vconf vconf ftype ftype ftype"
      "vol   vol   sa    sa    spher spher"
      "sym   sym   sym   sym   order order"
      "alt   alt   alt   alt   alt   alt"
    `,
    gridRowGap: 10,
  },

  property: {
    marginBottom: 10,
  },

  propName: {
    fontSize: 16,
    marginBottom: 5,
  },

  propValue: {
    fontFamily: fonts.andaleMono,
    color: 'DimGrey',
  },

  sub: {
    verticalAlign: 'sub',
    fontSize: 'smaller',
  },

  sup: {
    verticalAlign: 'super',
    fontSize: 'smaller',
  },
});

// FIXME use unicode or mathml instead
function Sub({ children }) {
  return <sub className={css(styles.sub)}>{children}</sub>;
}

function Sup({ children }) {
  return <sup className={css(styles.sup)}>{children}</sup>;
}

interface DatumDisplayProps {
  polyhedron: *;
  name: string;
}

interface InfoRow {
  name: string;
  area: string;
  property: *;
}

function groupedVertexConfig(config) {
  const array = config.split('.');
  const result = [];
  let current = { type: -1, count: 0 };
  _.each(array, type => {
    if (type === current.type) {
      current.count++;
    } else {
      if (current.count) result.push(current);
      current = { type, count: 1 };
    }
  });
  if (current.count) result.push(current);

  return result;
}

function displayVertexConfig(config) {
  const grouped = groupedVertexConfig(config);
  const children = _.map(grouped, (typeCount, i) => {
    const { type, count } = typeCount;
    const val =
      count === 1 ? (
        type
      ) : (
        <React.Fragment>
          {type}
          <Sup>{count}</Sup>
        </React.Fragment>
      );
    if (i === 0) return val;
    return <React.Fragment>.{val}</React.Fragment>;
  });
  return <span>{children}</span>;
}

function displayFaces({ polyhedron }) {
  const faceCounts = polyhedron.numFacesBySides();
  // TODO order by type of face
  return (
    <ul>
      {_.map(faceCounts, (count, type: string) => (
        <li>
          {count} {polygonNames[type]}
          {count !== 1 ? 's' : ''}
        </li>
      ))}
    </ul>
  );
}

const adjectiveMap = {
  digonal: 2,
  triangular: 3,
  square: 4,
  pentagonal: 5,
  hexagonal: 6,
  octagonal: 8,
  decagonal: 10,
};

const reverseAdjectiveMap = _.invert(adjectiveMap);

function getSymmetry(name) {
  const type = getType(name);
  if (type === 'Platonic solid' || type === 'Archimedean solid') {
    const group = (() => {
      if (name.includes('tetra')) {
        return 'T';
      }
      if (name.includes('cub') || name.includes('oct')) {
        return 'O';
      }
      if (name.includes('icosi') || name.includes('dodec')) {
        return 'I';
      }
    })();
    const chiral = name.includes('snub');
    return { group, sub: chiral ? '' : 'h' };
  }
  if (type === 'Prism') {
    const n = adjectiveMap[_.lowerCase(name.split('-')[0])];
    return { group: 'D', sub: `${n}h` };
  }
  if (type === 'Antiprism') {
    const n = adjectiveMap[_.lowerCase(name.split('-')[0])];
    return { group: 'D', sub: `${n}d` };
  }
  return getJohnsonSymmetry(unescapeName(name));
}

function getSymmetryName({ group = '', sub }) {
  if ('TOI'.includes(group)) {
    const chiralString = sub !== 'h' ? 'chiral ' : '';
    const base = (() => {
      switch (group) {
        case 'T':
          return 'tetrahedral';
        case 'O':
          return 'octahedral';
        case 'I':
          return 'icosahedral';
        default:
          return '';
      }
    })();
    return chiralString + base;
  }
  if (group === 'C') {
    if (sub === 's') {
      return 'bilateral';
    }
    if (sub === '2v') {
      return 'biradial';
    }
    const n = parseInt(_.trimEnd(sub, 'v'), 10);
    return reverseAdjectiveMap[n] + ' pyramidal';
  }
  if (group === 'D') {
    const last = sub.substr(sub.length - 1);
    if (last === 'h') {
      const n = parseInt(_.trimEnd(sub, 'h'), 10);
      return reverseAdjectiveMap[n] + ' prismatic';
    }
    if (last === 'd') {
      const n = parseInt(_.trimEnd(sub, 'd'), 10);
      return reverseAdjectiveMap[n] + ' antiprismatic';
    }

    const n = parseInt(sub, 10);
    return reverseAdjectiveMap[n] + ' dihedral';
  }
  throw new Error('invalid group');
}

function displaySymmetry({ polyhedron, name }) {
  const symmetry = getSymmetry(name);
  const symName = getSymmetryName(symmetry);
  const { group = '', sub } = symmetry;
  return (
    <React.Fragment>
      {_.capitalize(symName)}, {group}
      {sub ? <Sub>{sub}</Sub> : undefined}
    </React.Fragment>
  );
}

function getOrder(name) {
  const { group = '', sub } = getSymmetry(name);
  if ('TOI'.includes(group)) {
    const mult = sub === 'h' ? 2 : 1;
    const base = (() => {
      switch (group) {
        case 'T':
          return 12;
        case 'O':
          return 24;
        case 'I':
          return 60;
        default:
          return 0;
      }
    })();
    return base * mult;
  }
  if (group === 'C') {
    if (sub === 's') {
      return 2;
    }
    const n = parseInt(_.trimEnd(sub, 'v'), 10);
    return 2 * n;
  }
  if (group === 'D') {
    const last = sub.substr(sub.length - 1);
    if (last === 'h') {
      const n = parseInt(_.trimEnd(sub, 'h'), 10);
      return 4 * n;
    }
    if (last === 'd') {
      const n = parseInt(_.trimEnd(sub, 'd'), 10);
      return 4 * n;
    }

    const n = parseInt(sub, 10);
    return 2 * n;
  }
  throw new Error('invalid group');
}

const info: InfoRow[] = [
  {
    name: 'Vertices',
    area: 'verts',
    property: ({ polyhedron }) => polyhedron.numVertices(),
  },
  {
    name: 'Edges',
    area: 'edges',
    property: ({ polyhedron }) => polyhedron.numEdges(),
  },
  {
    name: 'Faces',
    area: 'faces',
    property: ({ polyhedron }) => polyhedron.numFaces(),
  },
  {
    name: 'Vertex configuration',
    area: 'vconf',
    property: ({ polyhedron }) => {
      const vConfig = polyhedron.vertexConfiguration();
      const configKeys = _.keys(vConfig);
      if (configKeys.length === 1) return configKeys[0];
      // TODO possibly square notation but that's hard
      return (
        <ul>
          {_.map(vConfig, (count, type: string) => (
            <li>
              {count}({displayVertexConfig(type)})
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    name: 'Faces by type',
    area: 'ftype',
    property: displayFaces,
  },

  {
    name: 'Volume',
    area: 'vol',
    property: ({ polyhedron: p }) => (
      <span>
        ≈{_.round(p.volume() / Math.pow(p.edgeLength(), 3), 3)}s<Sup>3</Sup>
      </span>
    ),
  },
  {
    name: 'Surface area',
    area: 'sa',
    property: ({ polyhedron: p }) => (
      <span>
        ≈{_.round(p.surfaceArea() / Math.pow(p.edgeLength(), 2), 3)}s<Sup>
          2
        </Sup>
      </span>
    ),
  },
  {
    name: 'Sphericity',
    area: 'spher',
    property: ({ polyhedron: p }) => `≈${_.round(p.sphericity(), 3)}`,
  },

  { name: 'Symmetry', area: 'sym', property: displaySymmetry },
  { name: 'Order', area: 'order', property: ({ name }) => getOrder(name) },

  {
    name: 'Also known as',
    area: 'alt',
    property: ({ name }) => {
      const alts = getAlternateNames(name);
      if (alts.length === 0) return '--';
      return <ul>{alts.map(alt => <li key={alt}>{alt}</li>)}</ul>;
    },
  },
];

function InfoPanel({ solidName, polyhedron }) {
  return (
    <div className={css(styles.table)}>
      <h2 className={css(styles.solidName)}>
        {_.capitalize(unescapeName(solidName))}, {toConwayNotation(solidName)}
      </h2>
      <div className={css(styles.solidType)}>{getType(solidName)}</div>
      <dl className={css(styles.dataList)}>
        {info.map(({ name, area, property: Property }) => {
          return (
            <div className={css(styles.property)} style={{ gridArea: area }}>
              <dd className={css(styles.propName)}>{name}</dd>
              <dt className={css(styles.propValue)}>
                <Property name={solidName} polyhedron={polyhedron} />
              </dt>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default connect(
  WithPolyhedron,
  ['solidName', 'polyhedron'],
)(InfoPanel);
