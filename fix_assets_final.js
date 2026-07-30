const fs = require('fs');
const path = 'c:/Users/kumar/OneDrive/Desktop/BrandOS/client/src/pages/Assets.jsx';
let c = fs.readFileSync(path, 'utf8');

// Fix 1: Close page-header div before error div
c = c.replace(
  '        </div>\n      {error &&',
  '        </div>\n      </div>\n      {error &&'
);

// Fix 2: Close empty-state div before ternary else
c = c.replace(
  '            <Link to=\"/assets/invoice/new\" className=\"btn btn-secondary\">New Invoice</Link>\n          </div>\n      ) : (',
  '            <Link to=\"/assets/invoice/new\" className=\"btn btn-secondary\">New Invoice</Link>\n          </div>\n        </div>\n      ) : ('
);

// Fix 3: Close card div before closing the ternary
c = c.replace(
  '            </table>\n          </div>\n      )}',
  '            </table>\n          </div>\n        </div>\n      )}'
);

fs.writeFileSync(path, c, 'utf8');
console.log('Fixed successfully. Length:', c.length);
