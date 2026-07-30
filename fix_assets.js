const fs = require('fs');
const path = 'c:/Users/kumar/OneDrive/Desktop/BrandOS/client/src/pages/Assets.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Close page-header div
content = content.replace(
  "          </select>\n        </div>\n      {error",
  "          </select>\n        </div>\n      </div>\n      {error"
);

// Fix 2: Close empty-state div before the ternary else
content = content.replace(
  "            <Link to=\"/assets/invoice/new\" className=\"btn btn-secondary\">New Invoice</Link>\n          </div>\n      ) : (",
  "            <Link to=\"/assets/invoice/new\" className=\"btn btn-secondary\">New Invoice</Link>\n          </div>\n        </div>\n      ) : ("
);

// Fix 3: Close card div before closing ternary
content = content.replace(
  "            </table>\n          </div>\n      )}",
  "            </table>\n          </div>\n        </div>\n      )}"
);

fs.writeFileSync(path, content);
console.log('Fixed successfully');
