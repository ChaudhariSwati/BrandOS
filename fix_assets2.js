const fs = require('fs');
const path = 'c:/Users/kumar/OneDrive/Desktop/BrandOS/client/src/pages/Assets.jsx';
let c = fs.readFileSync(path, 'utf8');

// The file has 3 missing closing divs. Let's do exact replacements:

// 1. Close the page-header div before error div
c = c.replace(
  '        </div>\n      {error &&',
  '        </div>\n      </div>\n      {error &&'
);

// 2. Close the empty-state div before the ternary else
c = c.replace(
  '            <Link to="/assets/invoice/new" className="btn btn-secondary">New Invoice</Link>\n          </div>\n      ) : (',
  '            <Link to="/assets/invoice/new" className="btn btn-secondary">New Invoice</Link>\n          </div>\n        </div>\n      ) : ('
);

// 3. Close the card div before closing the ternary
c = c.replace(
  '            </table>\n          </div>\n      )}',
  '            </table>\n          </div>\n        </div>\n      )}'
);

fs.writeFileSync(path, c);
console.log('Done. File length:', c.length);
// Print the return block to verify structure
const returnStart = c.indexOf('return (');
const returnEnd = c.indexOf(');', returnStart);
console.log(c.substring(returnStart, returnEnd + 2));
