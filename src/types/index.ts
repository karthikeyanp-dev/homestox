
export interface Profile {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
}

export interface Home {
    id: string;
    name: string;
    created_at: string;
}

export interface HomeMember {
    home_id: string;
    user_id: string;
    role: 'owner' | 'member';
    joined_at?: string;
}

export interface MemberWithProfile {
    home_id: string;
    user_id: string;
    role: 'owner' | 'member';
    joined_at?: string;
    profile: Profile;
}

export interface HomeInvitation {
    id: string;
    home_id: string;
    invited_email: string;
    invited_by: string;
    invited_user_id?: string;  // null if user hasn't registered yet
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    updated_at?: string;
    // Joined data
    home?: Home;
    inviter_profile?: Profile;
}

export type ItemCategory =
    | 'Vegetables'
    | 'Fruits'
    | 'Dairy & Eggs'
    | 'Pulses & Lentils'
    | 'Rice & Grains'
    | 'Oils'
    | 'Spices & Masalas'
    | 'Bakery & Breads'
    | 'Beverages'
    | 'Snacks & Dry Fruits'
    | 'Cleaning'
    | 'Personal Care'
    | 'Staples & Condiments'
    | 'Other';

export interface Item {
    id: string;
    home_id: string;
    name: string;
    status: 'enough' | 'nearing' | 'finished';
    category?: ItemCategory;
    current_brand?: string;
    updated_at: string;
    not_required?: boolean;  // Item doesn't need to be bought even if out of stock
    last_rating?: number | null;  // Rating from last purchase
    last_store?: string;  // Store from last purchase
}

// Category configuration with icons and colors for UI display
export const ITEM_CATEGORIES: Array<{
    value: ItemCategory;
    label: string;
    icon: string;
}> = [
    { value: 'Vegetables', label: 'Vegetables', icon: 'leaf' },
    { value: 'Fruits', label: 'Fruits', icon: 'fruit-cherries' },
    { value: 'Dairy & Eggs', label: 'Dairy & Eggs', icon: 'cheese' },
    { value: 'Pulses & Lentils', label: 'Pulses', icon: 'seed-outline' },
    { value: 'Rice & Grains', label: 'Grains', icon: 'grain' },
    { value: 'Oils', label: 'Oils', icon: 'bottle-tonic' },
    { value: 'Spices & Masalas', label: 'Spices', icon: 'shaker-outline' },
    { value: 'Bakery & Breads', label: 'Bakery', icon: 'bread-slice' },
    { value: 'Beverages', label: 'Beverages', icon: 'coffee' },
    { value: 'Snacks & Dry Fruits', label: 'Snacks', icon: 'food-apple-outline' },
    { value: 'Cleaning', label: 'Cleaning', icon: 'spray-bottle' },
    { value: 'Personal Care', label: 'Personal Care', icon: 'face-man-shimmer' },
    { value: 'Staples & Condiments', label: 'Staples', icon: 'shaker' },
    { value: 'Other', label: 'Other', icon: 'dots-horizontal' },
];

export interface Purchase {
    id: string;
    item_id: string;
    purchased_by: string;
    price: number;
    brand: string;
    store_name: string;
    rating: number;
    quantity: number;
    unit: string;
    purchased_at: string;
}
