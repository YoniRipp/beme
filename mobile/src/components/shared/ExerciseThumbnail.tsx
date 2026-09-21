import React from 'react';
import { Image, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { radius } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** The two sizes in use: `sm` beside a form row, `md` in the catalog list. */
const SIZES = { sm: 40, md: 48 } as const;

interface ExerciseThumbnailProps {
  imageUrl?: string;
  size?: keyof typeof SIZES;
}

/**
 * An exercise's photo, or the dumbbell that stands in for one.
 *
 * The Expo analogue of the web's `ImagePlaceholder type="exercise"`
 * (`frontend/src/components/shared/ImagePlaceholder.tsx`) — same 40/48px steps, same
 * rounded square, same fall back to a tinted glyph. Narrower than the web's component on
 * purpose: that one also serves food entries, and this client has no surface that needs
 * the food variant, so a `type` prop here would be a parameter with one legal value.
 *
 * **The `onError` fallback is the load-bearing part.** Every one of the ~873 seeded rows
 * carries an image, and all of them are remote — `cdn.jsdelivr.net/gh/yuhonas/free-exercise-db`
 * (see `backend/migrations/data/exercises-catalog.json`). A CDN that is slow, blocked on a
 * gym's wifi, or simply missing that one file must degrade to the icon; React Native
 * renders a failed `<Image>` as a blank box with no indication anything went wrong, which
 * in a list of 900 rows reads as "this exercise is broken".
 *
 * The `failed` flag is keyed off `imageUrl` so a recycled `FlatList` row that scrolls a
 * dead image out and a live one in does not inherit the previous row's failure. Without
 * the reset, one 404 partway down the catalog would silently spread to every row that
 * later reused that cell.
 *
 * `accessibilityRole="none"` and no label: the exercise's name is rendered immediately
 * beside this in every call site, so announcing the photo as well would read the row
 * twice. It is decoration, exactly as the web's `alt=""` says.
 */
export function ExerciseThumbnail({ imageUrl, size = 'md' }: ExerciseThumbnailProps) {
  const { colors } = useThemeContext();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const side = SIZES[size];
  const styles = useThemedStyles((colors) => ({
    box: {
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      // `workoutSoft` is the palette's tint of the same blue the web places this on
      // (`bg-info/10`), and it is the role the rest of this client already uses for
      // anything workout-shaped.
      backgroundColor: colors.workoutSoft,
    },
    image: {
      borderRadius: radius.md,
    },
  }));

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: side, height: side }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityRole="none"
        accessible={false}
      />
    );
  }

  return (
    <View style={[styles.box, { width: side, height: side }]} accessible={false}>
      <Icon source="dumbbell" size={Math.round(side / 2)} color={colors.workout} />
    </View>
  );
}
