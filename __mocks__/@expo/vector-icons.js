const React = require('react');
const { Text } = require('react-native');

const createMockIcon = (name) => {
  const Icon = (props) => React.createElement(Text, { testID: props.testID }, name);
  Icon.displayName = name;
  return Icon;
};

module.exports = {
  Ionicons: createMockIcon('Ionicons'),
  MaterialIcons: createMockIcon('MaterialIcons'),
  FontAwesome: createMockIcon('FontAwesome'),
  AntDesign: createMockIcon('AntDesign'),
};
