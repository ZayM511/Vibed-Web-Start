"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Save, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

export function ProfileSettings() {
  const { user, isLoaded } = useUser();
  const userProfile = useQuery(api.users.getUserProfile);
  const upsertUserProfile = useMutation(api.users.upsertUserProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");

  // Update form when user loads
  useEffect(() => {
    if (user) {
      setName(user.fullName || "");
      setEmail(user.primaryEmailAddress?.emailAddress || "");
    }
  }, [user]);

  // Update form when user profile loads
  useEffect(() => {
    if (userProfile) {
      setLocation(userProfile.location || "");
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) {
      console.error("No user found");
      toast.error("You must be signed in to update your profile");
      return;
    }

    // Validate name - only letters, spaces, hyphens, apostrophes, and periods allowed
    const nameRegex = /^[a-zA-Z\s'.-]+$/;
    if (!nameRegex.test(name.trim())) {
      toast.error("Full name can only contain letters, spaces, hyphens, apostrophes, and periods");
      return;
    }

    setIsSaving(true);
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      console.log("Updating profile with:", { firstName, lastName, location });
      console.log("Current user:", user);

      // Update Clerk user profile
      const result = await user.update({
        firstName,
        lastName,
      });

      console.log("Profile update result:", result);

      // Update Convex user profile with location (optional)
      await upsertUserProfile({
        location: location.trim() || undefined,
        hideLocationFromReviews: false,
      });

      // Reload user to see changes
      await user.reload();

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      console.error("No user found for image upload");
      toast.error("You must be signed in to upload a profile picture");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("Selected file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type);
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("File too large:", file.size);
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      console.log("Uploading profile image...");
      const result = await user.setProfileImage({ file });
      console.log("Profile image upload result:", result);

      // Reload user to see new image
      await user.reload();

      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      console.error("Upload error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(`Failed to upload profile picture: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Show loading state while user is being fetched
  if (!isLoaded) {
    return (
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
          <p className="text-white/60 mt-4">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  // Show error if user is not signed in
  if (!user) {
    return (
      <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
        <CardContent className="p-12 text-center">
          <p className="text-white/60">Please sign in to view your profile settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Profile Settings</CardTitle>
        <CardDescription className="text-white/60">
          Manage your account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-white/10">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-2xl font-bold">
                {user?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {!isUploading ? (
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Upload className="h-6 w-6 text-white" />
              </label>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Profile Picture</p>
            <p className="text-white/50 text-sm">
              {isUploading ? "Uploading..." : "Click to upload a new profile picture"}
            </p>
          </div>
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white flex items-center gap-2">
            <User className="h-4 w-4" />
            Full Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-50"
          />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-50"
          />
          <p className="text-xs text-white/40">
            Email cannot be changed here. Please contact support if you need to update your email.
          </p>
        </div>

        {/* Location Field */}
        <div className="space-y-2">
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            disabled={!isEditing}
            required={false}
            label="Location"
            placeholder="e.g., San Francisco, CA or Remote"
          />
          {!location && (
            <p className="text-xs text-amber-400">
              ⚠️ Location is required to submit community reviews
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setName(user?.fullName || "");
                  setLocation(userProfile?.location || "");
                }}
                disabled={isSaving}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/20"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
