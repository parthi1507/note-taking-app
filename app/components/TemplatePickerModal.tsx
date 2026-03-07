import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTE_TEMPLATES, NoteTemplate } from '../data/templates';

interface Props {
  visible: boolean;
  onSelect: (template: NoteTemplate) => void;
  onClose: () => void;
}

export default function TemplatePickerModal({ visible, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.heading}>Choose a Template</Text>
              <Text style={styles.subheading}>Start with structure or a blank page</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
              >
                {NOTE_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.card}
                    onPress={() => onSelect(template)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: template.color + '22' }]}>
                      <Ionicons
                        name={template.icon as any}
                        size={22}
                        color={template.color}
                      />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardName}>{template.name}</Text>
                      <Text style={styles.cardDesc}>{template.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#444" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#151525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardDesc: {
    color: '#666',
    fontSize: 13,
  },
});
