import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/ContributionFormConfig.gs', import.meta.url), 'utf8');
const context = vm.createContext({ JSON, Object, Array, String, Set, Error, console: { log() {} } });
vm.runInContext(`${source}\nglobalThis.__moveContributionQuestionToIndex = moveContributionQuestionToIndex_;`, context);

function genericItem(id) {
  return { getId() { return id; } };
}

test('contribution Form reorder uses numeric indices instead of passing typed items to Form.moveItem', () => {
  const order = [genericItem('a'), genericItem('c'), genericItem('b')];
  const moveCalls = [];
  const form = {
    getItems() { return order.slice(); },
    moveItem(fromIndex, toIndex) {
      assert.equal(typeof fromIndex, 'number');
      assert.equal(typeof toIndex, 'number');
      moveCalls.push([fromIndex, toIndex]);
      const [item] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, item);
    }
  };
  const newlyCreatedTypedCheckboxItem = { getId() { return 'b'; } };

  context.__moveContributionQuestionToIndex(form, newlyCreatedTypedCheckboxItem, 1, 'structured_tags');

  assert.deepEqual(moveCalls, [[2, 1]]);
  assert.deepEqual(order.map((item) => item.getId()), ['a', 'b', 'c']);
});

test('contribution Form reorder skips a question already at the requested index', () => {
  const order = [genericItem('a'), genericItem('b')];
  let moved = false;
  const form = {
    getItems() { return order.slice(); },
    moveItem() { moved = true; }
  };

  context.__moveContributionQuestionToIndex(form, { getId() { return 'b'; } }, 1, 'structured_tags');

  assert.equal(moved, false);
});
