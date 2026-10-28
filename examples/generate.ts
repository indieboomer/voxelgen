import {generateRock, type Recipe} from '../runtime-dist/index.js';
import recipe from '../public/recipes/boulder-C-123.json' with {type:'json'};
const rock=generateRock({recipe:recipe as Recipe,seed:2026,resolution:28});
console.log(rock.positions.length/3, 'vertices',rock.boundingBox);
