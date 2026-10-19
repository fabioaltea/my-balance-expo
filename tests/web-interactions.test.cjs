const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
const { load } = require('./load-ts.cjs');
const controls = load(path.join(__dirname, '../src/components/core/interactive.web.tsx'), {
  'react-native': native,
});
const noop = () => {};

for (const name of ['Pressable', 'TouchableOpacity']) {
  const Control = controls[name];
  const render = (props) =>
    renderToStaticMarkup(
      React.createElement(Control, props, React.createElement(native.Text, null, 'Action')),
    );

  test(`${name}: enabled controls expose hover feedback and preserve selection metadata`, () => {
    const html = render({
      onPress: noop,
      accessibilityRole: 'button',
      'aria-selected': true,
      dataSet: { accountId: '123' },
    });
    assert.match(html, /data-web-hover="true"/);
    assert.match(html, /data-account-id="123"/);
    assert.match(html, /aria-selected="true"/);
    assert.match(html, /role="button"/);
  });

  test(`${name}: disabled, inert, backdrop and movement-row controls do not gain another hover`, () => {
    for (const props of [
      {},
      { onPress: noop, disabled: true },
      { onPress: noop, accessibilityState: { disabled: true } },
      { onPress: noop, 'aria-disabled': true },
      { onPress: noop, hoverFeedback: false },
      { onPress: noop, dataSet: { movementRow: '' } },
    ]) {
      assert.match(render(props), /data-web-hover="false"/);
    }
  });

  test(`${name}: handlers, styles, children and refs pass through unchanged`, () => {
    const style = { backgroundColor: '#244437' };
    const ref = React.createRef();
    const props = {
      onPress: noop,
      onLongPress: noop,
      style,
      children: 'Save',
      accessibilityRole: 'switch',
    };
    const result = Control.render(props, ref);
    assert.equal(result.props.onPress, noop);
    assert.equal(result.props.onLongPress, noop);
    assert.equal(result.props.style, style);
    assert.equal(result.props.children, 'Save');
    assert.equal(result.props.ref, ref);
    assert.equal(result.props.accessibilityRole, 'switch');
    assert.equal(result.props.hoverFeedback, undefined);
  });
}

test('chart hit targets retain their own hover feedback', () => {
  const result = controls.Pressable.render({ onPress: noop, onHoverIn: noop }, null);
  assert.equal(result.props.dataSet['web-hover'], 'false');
  assert.equal(result.props.onHoverIn, noop);
});

test('native platform fallback exports the original components', () => {
  const fallback = load(path.join(__dirname, '../src/components/core/interactive.tsx'), {
    'react-native': native,
  });
  assert.equal(fallback.Pressable, native.Pressable);
  assert.equal(fallback.TouchableOpacity, native.TouchableOpacity);
});
